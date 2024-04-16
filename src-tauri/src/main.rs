#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use mysql::prelude::*;
use mysql::{PooledConn, params};
use mysql::Pool;
use tauri::State;

#[derive(Serialize, Deserialize, Clone)]
struct User {
    id: String,
    username: String,
}

struct CurrentUser {
    user: Mutex<Option<User>>,
}

struct MySQLConfig {
    user: String,
    password: String,
    host: String,
    database: String,
}

impl MySQLConfig {
    fn new(user: String, password: String, host: String, database: String) -> Self {
        Self {
            user,
            password,
            host,
            database,
        }
    }

    fn format_url(&self) -> String {
        format!(
            "mysql://{}:{}@{}/{}",
            self.user, self.password, self.host, self.database
        )
    }
}

#[tauri::command]
fn login(username: String, password: String, mysql_pool: State<Pool>, current_user: State<CurrentUser>) -> bool {
    let mut conn: PooledConn = mysql_pool.get_conn().expect("Failed to get connection.");

    let result: Option<(String, String)> = conn.exec_first(
        "SELECT id, username FROM users WHERE username = :username AND password = :password",
        params! {
            "username" => username,
            "password" => password,
        }
    ).expect("Failed to execute query");

    if let Some((id, username)) = result {
        let user = User { id, username };
        *current_user.user.lock().unwrap() = Some(user);
        return true;
    }

    false
}

#[tauri::command]
fn get_current_user(current_user: State<CurrentUser>) -> Option<User> {
    current_user.user.lock().unwrap().clone()
}

fn main() {
    let mysql_config = MySQLConfig::new(
        "root".to_string(),
        "".to_string(),
        "localhost".to_string(),
        "pre_tpa".to_string(),
    );

    let mysql_url = mysql_config.format_url();
    let pool = Pool::new(&*mysql_url).expect("Failed getting pool");

    let current_user = CurrentUser {
        user: Mutex::new(None),
    };

    tauri::Builder::default()
        .manage(pool)
        .manage(current_user)
        .invoke_handler(tauri::generate_handler![login, get_current_user])
        .run(tauri::generate_context!())
        .expect("Error while running Tauri application");
}