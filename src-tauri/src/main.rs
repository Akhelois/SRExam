use bcrypt::{hash, verify, DEFAULT_COST};
use cynic::http::SurfExt;
use cynic::{QueryBuilder};
use schema::__fields::Query::_get_room_by_number_arguments::room_number as room_number_arg;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use mysql::prelude::*;
use mysql::{PooledConn, params};
use mysql::Pool;
use tauri::{State};
use async_std::task;

#[cynic::schema("sr-exam")]
mod schema {}

#[derive(cynic::QueryFragment, Debug, Serialize, Clone)]
#[cynic(graphql_type = "User")]
pub struct User {
    #[cynic(rename = "bn_number")]
    pub bn_number: cynic::Id,
    pub nim: String,
    pub name: String,
    pub major: String,
    pub role: String,
    pub initial: Option<String>,
}

#[derive(cynic::QueryFragment, Debug)]
#[cynic(graphql_type = "Query")]
pub struct UsersQuery {
    pub get_all_user: Vec<User>,
}

#[derive(cynic::QueryFragment, Debug)]
#[cynic(graphql_type = "Query")]
pub struct GetAllSubject {
    pub get_all_subject: Vec<Subject>,
}

#[derive(cynic::QueryFragment, Debug, Serialize, Clone)]
pub struct Subject {
    #[cynic(rename = "subject_code")]
    pub subject_code: String,
    #[cynic(rename = "subject_name")]
    pub subject_name: String,
}

#[derive(cynic::QueryFragment, Debug)]
#[cynic(graphql_type = "Query")]
pub struct GetAllRoom {
    pub get_all_room: Vec<Room>,
}

#[derive(cynic::QueryFragment, Debug, Serialize)]
pub struct Room {
    pub campus: String,
    #[cynic(rename = "room_capacity")]
    pub room_capacity: i32,
    #[cynic(rename = "room_number")]
    pub room_number_str: String,
}

#[derive(Debug, Serialize)]
pub struct Shift {
    pub shift_id: String,
    pub start_time: String, 
    pub end_time: String,   
}

#[derive(cynic::QueryFragment, Debug)]
#[cynic(graphql_type = "Query")]
pub struct PasswordbyNIM {
    #[arguments(nim = "&str")]
    #[cynic(rename = "getPasswordByNIM")]
    pub get_password_by_nim: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct RoomTransaction {
  room_number: String, 
  shift_id: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct CurrentUser {
    user: User,
}

struct AppState {
    user: Mutex<Option<CurrentUser>>,
    mysql_pool: Pool,
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
fn login(name: String, password: String, mysql_pool: State<'_, Pool>, current_user: State<'_, AppState>) -> Result<Option<String>, String> {
    let mut conn: PooledConn = mysql_pool.get_conn().map_err(|e| format!("Failed to get connection: {}", e))?;
    let is_nim = name.chars().all(char::is_numeric);

    let result: Option<(String, String, String, Option<String>, String, String, String)> = conn.exec_first(
        "SELECT bn_number, name, major, initial, nim, role, password FROM users WHERE nim = :name OR initial = :name",
        params! {
            "name" => name.clone(),
        }
    ).map_err(|e| format!("Failed to execute query: {}", e))?;

    if let Some((bn_number, name, major, initial, nim, role, stored_password)) = result {
        let selected_username = if stored_password.is_empty() {
            if is_nim {
                nim.clone()
            } else {
                initial.clone().unwrap_or_default()
            }
        } else {
            name.clone()
        };

        if stored_password.is_empty() || verify(&password, &stored_password).map_err(|e| format!("Failed to verify password: {}", e))? {
            let user = User {
                bn_number: bn_number.into(),
                nim,
                name,
                major,
                role,
                initial,
            };

            match current_user.user.lock() {
                Ok(mut user_lock) => *user_lock = Some(CurrentUser { user }),
                Err(e) => return Err(format!("Failed to lock mutex: {}", e)),
            };

            return Ok(Some(if is_nim { "nim" } else { "initial" }.to_string()));
        } else {
            return Ok(None);
        }
    } else {
        return Ok(None);
    }
}

#[tauri::command]
fn change_password(old_password: String, new_password: String, mysql_pool: State<'_, Pool>, current_user: State<'_, AppState>) -> Result<bool, String> {
    let mut conn: PooledConn = mysql_pool.get_conn().map_err(|e| format!("Failed to get connection: {}", e))?;
    
    let user_guard = current_user.user.lock().map_err(|e| format!("Failed to lock mutex: {}", e))?;
    if let Some(current_user) = &*user_guard {
        let nim = &current_user.user.nim;
        let initial = &current_user.user.initial;
        let stored_password: Option<String> = if let Some(initial) = initial {
            conn.exec_first(
                "SELECT password FROM users WHERE nim = :nim OR initial = :initial",
                params! {
                    "nim" => nim,
                    "initial" => initial,
                }
            )
        } else {
            conn.exec_first(
                "SELECT password FROM users WHERE nim = :nim",
                params! {
                    "nim" => nim,
                }
            )
        }.map_err(|e| format!("Failed to execute query: {}", e))?;

        if let Some(stored_password) = stored_password {
            if stored_password.is_empty() || verify(&old_password, &stored_password).map_err(|e| format!("Failed to verify password: {}", e))? {
                let hashed_new_password = hash(new_password, DEFAULT_COST).map_err(|e| format!("Failed to hash password: {}", e))?;
                
                if let Some(initial) = initial {
                    conn.exec_drop(
                        "UPDATE users SET password = :new_password WHERE nim = :nim OR initial = :initial",
                        params! {
                            "nim" => nim,
                            "initial" => initial,
                            "new_password" => hashed_new_password,
                        }
                    )
                } else {
                    conn.exec_drop(
                        "UPDATE users SET password = :new_password WHERE nim = :nim",
                        params! {
                            "nim" => nim,
                            "new_password" => hashed_new_password,
                        }
                    )
                }.map_err(|e| format!("Failed to update password: {}", e))?;
                return Ok(true);
            } else {
                return Ok(false);
            }
        } else {
            return Err("User not found".to_string());
        }
    } else {
        return Err("No user is currently logged in".to_string());
    }
}

#[tauri::command]
fn get_current_user(state: State<'_, AppState>) -> Option<CurrentUser> {
    state.user.lock().unwrap().clone()
}

#[tauri::command]
async fn get_all_users() -> Result<Vec<User>, ()> {
    let operation = UsersQuery::build(());
    let response = surf::post("https://academic-slc.apps.binus.ac.id/tpa-241/query")
        .run_graphql(operation)
        .await;

    match response {
        Ok(response) => {
            let data = response.data.unwrap();
            Ok(data.get_all_user)
        }
        Err(_) => Err(()),
    }
}

#[tauri::command]
async fn get_all_subject() -> Result<Vec<Subject>, ()>{
    let operation = GetAllSubject::build(());
    let response = surf::post("https://academic-slc.apps.binus.ac.id/tpa-241/query")
        .run_graphql(operation)
        .await;

    match response{
        Ok(response) => {
            let data = response.data.unwrap();
            Ok(data.get_all_subject)
        }
        Err(_) => Err(()),
    } 
}

#[tauri::command]
async fn get_all_room() -> Result<Vec<Room>, String> {
    let operation = GetAllRoom::build(());
    let response = surf::post("https://academic-slc.apps.binus.ac.id/tpa-241/query")
        .run_graphql(operation)
        .await;

    match response {
        Ok(response) => {
            let data = response.data.unwrap();
            Ok(data.get_all_room)
        }
        Err(_) => Err("Failed to fetch rooms".to_string()),
    }
}

#[tauri::command]
async fn get_all_shifts(conn: &mut PooledConn) -> Result<Vec<Shift>, String> {
    let shifts_query = "SELECT shift_id, start_time, end_time FROM shifts";
    let shifts: Vec<Shift> = conn.query_map(shifts_query, |(shift_id, start_time, end_time)| {
        Shift {
            shift_id,
            start_time,
            end_time,
        }
    }).map_err(|e| format!("Failed to fetch shifts: {}", e))?;

    Ok(shifts)
}

#[tauri::command]
async fn get_password_by_nim(_nim: String) -> Result<String, ()> {
    let operation = PasswordbyNIM::build({});
    let response = surf::post("https://academic-slc.apps.binus.ac.id/tpa-241/query")
        .run_graphql(operation)
        .await;

    match response {
        Ok(response) => {
            let data = response.data.unwrap();
            Ok(data.get_password_by_nim)
        }
        Err(_err) => Err(()),
    }
}

#[tauri::command]
async fn get_room_transaction(mysql_pool: State<'_, Pool>, selected_date: String) -> Result<Vec<RoomTransaction>, String> {
    let mut conn: PooledConn = mysql_pool.get_conn().map_err(|e| format!("Failed to get connection: {}", e))?;
    
    let query = "SELECT room_number, shift_id FROM transaction_header WHERE transactionDate = :selected_date";
    
    let result: Vec<(String, String)> = conn.exec(query, params! { "selected_date" => selected_date })
        .map_err(|e| format!("Failed to execute query: {}", e))?;
    
    let room_transactions = result.into_iter()
        .map(|(room_number, shift_id)| RoomTransaction {
            room_number,
            shift_id,
        })
        .collect();
    
    Ok(room_transactions)
}


#[tauri::command]
async fn insert_users(conn: &mut PooledConn) -> Result<(), ()> {
    let users = get_all_users().await?;

    for user in users {
        // println!("Inserting user: {:?}", user);
        let bn_number = user.bn_number.clone();

        let user_exists: Option<String> = conn.exec_first(
            r"SELECT bn_number FROM users WHERE bn_number = :bn_number",
            params! {
                "bn_number" => bn_number.clone().into_inner(),
            },
        ).expect("Failed to check if user exists");

        if user_exists.is_none() {
            conn.exec_drop(
                r"INSERT INTO users (bn_number, nim, name, major, role, initial) 
                VALUES (:bn_number, :nim, :name, :major, :role, :initial)
                ON DUPLICATE KEY UPDATE initial = VALUES(initial), name = VALUES(name), role = VALUES(role)",
                params! {
                    "bn_number" => bn_number.into_inner(),
                    "nim" => user.nim,
                    "name" => user.name,
                    "major" => user.major,
                    "role" => user.role,
                    "initial" => user.initial.unwrap_or_default(),
                },
            ).expect("Failed to insert");
        } else {
            // println!("User already exists: {:?}", user);
        }
    }
    Ok(())
}

#[tauri::command]
async fn insert_room(conn: &mut PooledConn) -> Result<(), String> {
    let rooms = get_all_room().await.map_err(|_| "Failed to fetch rooms".to_string())?;

    for room in rooms {
        let room_num_str = room.room_number_str.clone();

        let room_exists: Option<String> = conn.exec_first(
            r"SELECT room_number FROM room WHERE room_number = :room_number",
            params! {
                "room_number" => room_num_str.clone(),
            },
        ).map_err(|e| format!("Failed to check if room exists: {}", e))?;

        if room_exists.is_none() {
            conn.exec_drop(
                r"INSERT INTO room (room_number, room_capacity, campus)
                VALUES (:room_number, :room_capacity, :campus)",
                params! {
                    "room_number" => room.room_number_str,
                    "room_capacity" => room.room_capacity,
                    "campus" => room.campus,
                },
            ).map_err(|e| format!("Failed to insert room: {}", e))?;
        }
    }
    Ok(())
}

fn create_users_table_if_not_exists(conn: &mut PooledConn) -> Result<(), mysql::Error> {
    conn.exec_drop(
        r"CREATE TABLE IF NOT EXISTS users (
            bn_number VARCHAR(255) PRIMARY KEY,
            nim VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            major VARCHAR(255),
            role VARCHAR(255),
            initial VARCHAR(255),
            password VARCHAR(255)
        )",
        ()
    )
}

fn create_shift_table_if_not_exists(conn: &mut PooledConn) -> Result<(), mysql::Error> {
    conn.exec_drop(
        r"CREATE TABLE IF NOT EXISTS shift (
            shift_id VARCHAR(1) PRIMARY KEY,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL
        )",
        ()
    )
}

fn create_room_table_if_not_exists(conn: &mut PooledConn) -> Result<(), mysql::Error> {
    conn.exec_drop(
        r"CREATE TABLE IF NOT EXISTS room (
            room_number VARCHAR(255) PRIMARY KEY,
            room_capacity INT NOT NULL,
            campus VARCHAR(255) NOT NULL
        )",
        ()
    )
}

fn create_subject_table_if_not_exists(conn: &mut PooledConn) -> Result<(), mysql::Error> {
    conn.exec_drop(
        r"CREATE TABLE IF NOT EXISTS subject (
            subject_code VARCHAR(255) PRIMARY KEY,
            subject_name VARCHAR(255) NOT NULL
        )",
        ()
    )
}

fn create_exam_transaction_if_not_exists(conn: &mut PooledConn) -> Result<(), mysql::Error> {
    conn.exec_drop(
        r"CREATE TABLE IF NOT EXISTS exam_transaction (
            transactionID INT PRIMARY KEY,
            subject_code VARCHAR(50) NOT NULL,
            room_number VARCHAR(255) NOT NULL,
            shift_id VARCHAR(1) NOT NULL,
            transactionDate DATE,
            transactionTime TIME,
            setNumber INT,
            FOREIGN KEY (subject_code) REFERENCES subject(subject_code),
            FOREIGN KEY (room_number) REFERENCES room(room_number),
            FOREIGN KEY (shift_id) REFERENCES shift(shift_id)
        )",
        ()
    )
}

fn main() {
    let mysql_config = MySQLConfig::new(
        "root".to_string(),
        "".to_string(),
        "localhost".to_string(),
        "sr_exam".to_string(),
    );

    let mysql_url = mysql_config.format_url();
    let pool = Pool::new(&*mysql_url).expect("Failed to create MySQL pool");

    {
        let mut conn = pool.get_conn().expect("Failed to get MySQL connection");
        create_users_table_if_not_exists(&mut conn).expect("Failed to create users table");
        create_shift_table_if_not_exists(&mut conn).expect("Failed to create shift table");
        create_room_table_if_not_exists(&mut conn).expect("Failed to create room table");
        create_subject_table_if_not_exists(&mut conn).expect("Failed to create subject table");
        create_exam_transaction_if_not_exists(&mut conn).expect("Failed to create exam transaction");

        task::block_on(async {
            insert_users(&mut conn).await.expect("Failed to insert users");
            insert_room(&mut conn).await.expect("Failed to insert rooms");
            get_all_shifts(&mut conn).await.expect("failed to fetch");
        });
    }

    tauri::Builder::default()
        .manage(AppState {
            user: Mutex::new(None),
            mysql_pool: pool.clone(),
        })
        .manage(pool.clone())
        .invoke_handler(tauri::generate_handler![
            login,
            get_current_user,
            get_all_users,
            get_all_subject,
            get_all_room,
            get_password_by_nim,
            change_password,
            get_room_transaction
        ])
        .run(tauri::generate_context!())
        .expect("Error while running Tauri application");
}