#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, String, Symbol, Vec,
};

const ADMIN: Symbol = symbol_short!("ADMIN");
const GROUP_NAME: Symbol = symbol_short!("GRPNAME");
const GROUP_DESC: Symbol = symbol_short!("GRPDESC");
const THRESHOLD: Symbol = symbol_short!("THRESH");
const EXP_COUNT: Symbol = symbol_short!("EXPCOUNT");
const MEMBERS: Symbol = symbol_short!("MEMBERS");
const TREASURY: Symbol = symbol_short!("TREASURY");

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ExpenseStatus { Pending, Approved, Rejected, Settled }

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ExpenseCategory { General, Food, Transport, Utilities, Entertainment, Rent, Medical, Other }

#[contracttype]
#[derive(Clone, Debug)]
pub struct Expense {
    pub id: u32,
    pub creator: Address,
    pub description: String,
    pub amount: i128,
    pub category: ExpenseCategory,
    pub status: ExpenseStatus,
    pub approvals: u32,
    pub rejections: u32,
    pub created_at: u64,
    pub resolved_at: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct GroupInfo {
    pub name: String,
    pub description: String,
    pub admin: Address,
    pub member_count: u32,
    pub expense_count: u32,
    pub treasury_balance: i128,
    pub approval_threshold: u32,
}

fn get_members(env: &Env) -> Vec<Address> {
    env.storage().instance().get::<Symbol, Vec<Address>>(&MEMBERS)
        .unwrap_or_else(|| Vec::new(env))
}
fn set_members(env: &Env, m: &Vec<Address>) { env.storage().instance().set(&MEMBERS, m); }
fn get_count(env: &Env) -> u32 { env.storage().instance().get::<Symbol, u32>(&EXP_COUNT).unwrap_or(0) }
fn get_exp(env: &Env, id: u32) -> Option<Expense> {
    env.storage().instance().get::<(Symbol, u32), Expense>(&(symbol_short!("EXP"), id))
}
fn set_exp(env: &Env, id: u32, e: &Expense) {
    env.storage().instance().set(&(symbol_short!("EXP"), id), e);
}
fn voted(env: &Env, id: u32, v: &Address) -> bool {
    env.storage().instance().get::<(Symbol, u32, Address), bool>(&(symbol_short!("VOTED"), id, v.clone())).unwrap_or(false)
}
fn mark_vote(env: &Env, id: u32, v: &Address) {
    env.storage().instance().set(&(symbol_short!("VOTED"), id, v.clone()), &true);
}
fn treasury(env: &Env) -> i128 { env.storage().instance().get::<Symbol, i128>(&TREASURY).unwrap_or(0) }
fn set_treasury(env: &Env, b: i128) { env.storage().instance().set(&TREASURY, &b); }
fn require_member(env: &Env, a: &Address) {
    let m = get_members(env);
    for i in 0..m.len() { if &m.get(i).unwrap() == a { return; } }
    panic!("not a member");
}

#[contract]
pub struct ExpenseGroupContract;

#[contractimpl]
impl ExpenseGroupContract {
    pub fn initialize(env: Env, admin: Address, name: String, description: String, approval_threshold: u32) {
        if env.storage().instance().has(&ADMIN) { panic!("already initialized"); }
        admin.require_auth();
        let t = approval_threshold.max(51).min(100);
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&GROUP_NAME, &name);
        env.storage().instance().set(&GROUP_DESC, &description);
        env.storage().instance().set(&THRESHOLD, &t);
        env.storage().instance().set(&EXP_COUNT, &0u32);
        let mut members: Vec<Address> = Vec::new(&env);
        members.push_back(admin.clone());
        set_members(&env, &members);
        env.events().publish((symbol_short!("GROUP"), symbol_short!("INIT")), (name, admin));
    }

    pub fn join_group(env: Env, member: Address) {
        member.require_auth();
        let m = get_members(&env);
        for i in 0..m.len() { if m.get(i).unwrap() == member { panic!("already a member"); } }
        if m.len() >= 50 { panic!("max members reached"); }
        let mut nm = m.clone();
        nm.push_back(member.clone());
        set_members(&env, &nm);
        env.events().publish((symbol_short!("MEMBER"), symbol_short!("JOINED")), member);
    }

    pub fn leave_group(env: Env, member: Address) {
        member.require_auth();
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        if member == admin { panic!("admin cannot leave"); }
        let m = get_members(&env);
        let mut nm: Vec<Address> = Vec::new(&env);
        for i in 0..m.len() { let v = m.get(i).unwrap(); if v != member { nm.push_back(v); } }
        set_members(&env, &nm);
    }

    pub fn deposit(env: Env, member: Address, amount: i128) {
        member.require_auth();
        require_member(&env, &member);
        if amount <= 0 { panic!("amount must be positive"); }
        set_treasury(&env, treasury(&env) + amount);
        env.events().publish((symbol_short!("TREASURY"), symbol_short!("DEPOSIT")), (member, amount));
    }

    pub fn create_expense(env: Env, creator: Address, description: String, amount: i128, category: ExpenseCategory) -> u32 {
        creator.require_auth();
        require_member(&env, &creator);
        if amount <= 0 { panic!("amount must be positive"); }
        let id = get_count(&env) + 1;
        env.storage().instance().set(&EXP_COUNT, &id);
        set_exp(&env, id, &Expense {
            id, creator: creator.clone(), description, amount, category,
            status: ExpenseStatus::Pending, approvals: 0, rejections: 0,
            created_at: env.ledger().timestamp(), resolved_at: 0,
        });
        env.events().publish((symbol_short!("EXPENSE"), symbol_short!("CREATED")), (id, creator, amount));
        id
    }

    pub fn approve_expense(env: Env, voter: Address, expense_id: u32) {
        voter.require_auth();
        require_member(&env, &voter);
        let mut e = get_exp(&env, expense_id).unwrap_or_else(|| panic!("expense not found"));
        if e.status != ExpenseStatus::Pending { panic!("expense not pending"); }
        if voted(&env, expense_id, &voter) { panic!("already voted"); }
        mark_vote(&env, expense_id, &voter);
        e.approvals += 1;
        let members = get_members(&env);
        let t: u32 = env.storage().instance().get(&THRESHOLD).unwrap_or(51);
        let req = { let r = members.len() * t / 100; if r == 0 { 1 } else { r } };
        env.events().publish((symbol_short!("EXPENSE"), symbol_short!("APPROVED")), (expense_id, voter, e.approvals));
        if e.approvals >= req {
            if treasury(&env) < e.amount { panic!("insufficient treasury balance"); }
            set_treasury(&env, treasury(&env) - e.amount);
            e.status = ExpenseStatus::Settled;
            e.resolved_at = env.ledger().timestamp();
            env.events().publish((symbol_short!("EXPENSE"), symbol_short!("SETTLED")), (expense_id, e.creator.clone(), e.amount));
        }
        set_exp(&env, expense_id, &e);
    }

    pub fn reject_expense(env: Env, voter: Address, expense_id: u32) {
        voter.require_auth();
        require_member(&env, &voter);
        let mut e = get_exp(&env, expense_id).unwrap_or_else(|| panic!("expense not found"));
        if e.status != ExpenseStatus::Pending { panic!("expense not pending"); }
        if voted(&env, expense_id, &voter) { panic!("already voted"); }
        mark_vote(&env, expense_id, &voter);
        e.rejections += 1;
        let members = get_members(&env);
        let t: u32 = env.storage().instance().get(&THRESHOLD).unwrap_or(51);
        let rr = { let r = members.len() * (100 - t) / 100; if r == 0 { 1 } else { r } };
        env.events().publish((symbol_short!("EXPENSE"), symbol_short!("REJECTED")), (expense_id, voter, e.rejections));
        if e.rejections >= rr { e.status = ExpenseStatus::Rejected; e.resolved_at = env.ledger().timestamp(); }
        set_exp(&env, expense_id, &e);
    }

    pub fn get_group_info(env: Env) -> GroupInfo {
        GroupInfo {
            name: env.storage().instance().get(&GROUP_NAME).unwrap(),
            description: env.storage().instance().get(&GROUP_DESC).unwrap(),
            admin: env.storage().instance().get(&ADMIN).unwrap(),
            member_count: get_members(&env).len(),
            expense_count: get_count(&env),
            treasury_balance: treasury(&env),
            approval_threshold: env.storage().instance().get(&THRESHOLD).unwrap_or(51),
        }
    }

    pub fn get_expense(env: Env, expense_id: u32) -> Expense {
        get_exp(&env, expense_id).unwrap_or_else(|| panic!("expense not found"))
    }

    pub fn get_all_expenses(env: Env) -> Vec<Expense> {
        let count = get_count(&env);
        let mut result: Vec<Expense> = Vec::new(&env);
        for i in 1..=count { if let Some(e) = get_exp(&env, i) { result.push_back(e); } }
        result
    }

    pub fn get_members(env: Env) -> Vec<Address> { get_members(&env) }

    pub fn is_member(env: Env, address: Address) -> bool {
        let m = get_members(&env);
        for i in 0..m.len() { if m.get(i).unwrap() == address { return true; } }
        false
    }

    pub fn get_treasury_balance(env: Env) -> i128 { treasury(&env) }
}
