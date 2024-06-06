use bcrypt::{hash, verify, DEFAULT_COST};
use cynic::http::SurfExt;
use cynic::{QueryBuilder};
use schema::__fields;
use schema::__fields::Enrollment::class_code;
use schema::__fields::Query::_get_room_by_number_arguments::room_number as room_number_arg;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use mysql::{prelude::*, TxOpts};
use mysql::{PooledConn, params};
use mysql::Pool;
use tauri::{State};
use async_std::task;
use rand::Rng;

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
    pub subject_code_str: String,
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

#[derive(cynic::QueryFragment, Debug)]
#[cynic(graphql_type = "Query")]
pub struct GetAllEnrollment {
    pub get_all_enrollment: Option<Vec<Option<Enrollment>>>,
}

#[derive(cynic::QueryFragment, Debug, Serialize, Clone)]
pub struct Enrollment {
    #[cynic(rename = "class_code")]
    pub class_code_str: String,
    pub nim: String,
    #[cynic(rename = "subject_code")]
    pub subject_code: String,
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExamTransaction {
    pub transaction_id: String,
    pub subject_code: String,
    pub room_number: String,
    pub shift_id: String,
    pub transaction_date: String,
    pub transaction_time: String,
    pub seat_number: String,
    pub status: String,
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
fn login(
    name: String,
    password: String,
    mysql_pool: State<'_, Pool>,
    current_user: State<'_, AppState>,
) -> Result<Option<String>, String> {
    let mut conn = mysql_pool.get_conn().map_err(|e| format!("Failed to get connection: {}", e))?;
    let is_nim = name.chars().all(char::is_numeric);

    let query = "SELECT bn_number, name, major, initial, nim, role, password FROM users WHERE nim = :name OR initial = :name";
    let params = params! { "name" => name.clone() };
    let result: Option<(String, String, String, Option<String>, String, String, Option<String>)> = conn.exec_first(query, params).map_err(|e| format!("Failed to execute query: {}", e))?;

    if let Some((bn_number, name, major, initial, nim, role, stored_password)) = result {
        if stored_password.is_none() || verify(&password, &stored_password.unwrap_or_default()).map_err(|e| format!("Failed to verify password: {}", e))? {
            let user = User {
                bn_number: bn_number.into(),
                nim: nim.clone(),
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
    }
    Ok(None)
}

#[tauri::command]
fn change_password(
    old_password: String,
    new_password: String,
    mysql_pool: State<'_, Pool>,
    current_user: State<'_, AppState>,
) -> Result<bool, String> {
    let mut conn = mysql_pool.get_conn().map_err(|e| format!("Failed to get connection: {}", e))?;
    let user_guard = current_user.user.lock().map_err(|e| format!("Failed to lock mutex: {}", e))?;

    if let Some(current_user) = &*user_guard {
        let nim = &current_user.user.nim;
        let initial = &current_user.user.initial;
        let query = if let Some(initial) = initial {
            "SELECT password FROM users WHERE nim = :nim OR initial = :initial"
        } else {
            "SELECT password FROM users WHERE nim = :nim"
        };
        let params = if let Some(initial) = initial {
            params! { "nim" => nim, "initial" => initial }
        } else {
            params! { "nim" => nim }
        };
        let stored_password: Option<String> = conn.exec_first(query, params).map_err(|e| format!("Failed to execute query: {}", e))?;

        if stored_password.is_none() || stored_password.as_ref().map_or(false, |pw| pw.is_empty()) {
            // If the stored password is NULL or empty, allow the password change
            if !new_password.is_empty() {
                let hashed_new_password = hash(new_password, DEFAULT_COST).map_err(|e| format!("Failed to hash password: {}", e))?;
                let update_query = if let Some(initial) = initial {
                    "UPDATE users SET password = :new_password WHERE nim = :nim OR initial = :initial"
                } else {
                    "UPDATE users SET password = :new_password WHERE nim = :nim"
                };
                let update_params = if let Some(initial) = initial {
                    params! { "nim" => nim, "initial" => initial, "new_password" => hashed_new_password }
                } else {
                    params! { "nim" => nim, "new_password" => hashed_new_password }
                };
                conn.exec_drop(update_query, update_params).map_err(|e| format!("Failed to update password: {}", e))?;
                return Ok(true);
            } else {
                return Err("New password cannot be empty".to_string());
            }
        } else if verify(&old_password, &stored_password.unwrap()).map_err(|e| format!("Failed to verify password: {}", e))? {
            // If the old password provided by the user is correct, allow the password change
            if !new_password.is_empty() {
                let hashed_new_password = hash(new_password, DEFAULT_COST).map_err(|e| format!("Failed to hash password: {}", e))?;
                let update_query = if let Some(initial) = initial {
                    "UPDATE users SET password = :new_password WHERE nim = :nim OR initial = :initial"
                } else {
                    "UPDATE users SET password = :new_password WHERE nim = :nim"
                };
                let update_params = if let Some(initial) = initial {
                    params! { "nim" => nim, "initial" => initial, "new_password" => hashed_new_password }
                } else {
                    params! { "nim" => nim, "new_password" => hashed_new_password }
                };
                conn.exec_drop(update_query, update_params).map_err(|e| format!("Failed to update password: {}", e))?;
                return Ok(true);
            } else {
                return Err("New password cannot be empty".to_string());
            }
        } else {
            return Ok(false);
        }
    }
    Err("Current user not authenticated".to_string())
}

#[tauri::command]
fn edit_role(
    bn_number: String,
    new_role: String,
    mysql_pool: State<'_, Pool>,
) -> Result<(), String> {
    let mut conn: PooledConn = mysql_pool
        .get_conn()
        .map_err(|e| format!("Failed to get connection: {}", e))?;

    conn.exec_drop(
        "UPDATE users SET role = :role WHERE bn_number = :bn_number",
        params! {
            "role" => new_role,
            "bn_number" => bn_number,
        },
    )
    .map_err(|e| format!("Failed to update user role: {}", e))?;

    Ok(())
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
async fn get_all_enrollment() -> Result<Vec<Enrollment>, String> {
    let operation = GetAllEnrollment::build(());
    let response = surf::post("https://academic-slc.apps.binus.ac.id/tpa-241/query")
        .run_graphql(operation)
        .await;

    match response {
        Ok(response) => {
            let data = response.data.unwrap();
            if let Some(enrollments) = data.get_all_enrollment {
                let enrollments: Vec<Enrollment> = enrollments
                    .into_iter()
                    .filter_map(|opt_enrollment| opt_enrollment)
                    .collect();
                Ok(enrollments)
            } else {
                Err("No enrollments found".to_string())
            }
        }
        Err(_) => Err("Failed to fetch enrollment".to_string()),
    }
}

#[tauri::command]
async fn get_all_shifts(mysql_pool: State<'_, Pool>) -> Result<Vec<Shift>, String> {
    let mut conn: PooledConn = mysql_pool.get_conn().map_err(|e| format!("Failed to get connection: {}", e))?;
    let shifts_query = "SELECT shift_id, start_time, end_time FROM shift"; 
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
async fn get_room_transaction(mysql_pool: State<'_, Pool>, selected_date: String, room_number: Option<String>) -> Result<Vec<RoomTransaction>, String> {
    let mut conn: PooledConn = mysql_pool.get_conn().map_err(|e| format!("Failed to get connection: {}", e))?;
    
    let query = match room_number {
        Some(ref room) => "SELECT room_number, shift_id FROM exam_transaction WHERE transactionDate = :selected_date AND room_number = :room_number",
        None => "SELECT room_number, shift_id FROM exam_transaction WHERE transactionDate = :selected_date",
    };

    let params = match room_number {
        Some(room) => params! { "selected_date" => selected_date, "room_number" => room },
        None => params! { "selected_date" => selected_date },
    };
    
    let result: Vec<(String, String)> = conn.exec(query, params)
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
async fn get_exam_transaction(mysql_pool: State<'_, Pool>) -> Result<Vec<ExamTransaction>, String> {
    let mut conn = mysql_pool.get_conn().map_err(|e| format!("Failed to get connection: {}", e))?;

    let transactions: Vec<ExamTransaction> = conn.query_map(
        "SELECT transaction_id, subject_code, room_number, shift_id, transaction_date, transaction_time, seat_number, status FROM exam_transaction",
        |(transaction_id, subject_code, room_number, shift_id, transaction_date, transaction_time, seat_number, status)| {
            ExamTransaction {
                transaction_id,
                subject_code,
                room_number,
                shift_id,
                transaction_date,
                transaction_time,
                seat_number,
                status,
            }
        }
    ).map_err(|e| format!("Failed to execute query: {}", e))?;    

    Ok(transactions)
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

#[tauri::command]
async fn insert_enrollment(conn: &mut PooledConn) -> Result<(), String> {
    let enrollments = get_all_enrollment().await.map_err(|_| "Failed to fetch enroolment".to_string())?;

    for enrollment in enrollments {
        let class_code_str = enrollment.class_code_str.clone();

        let enrollment_exists: Option<String> = conn.exec_first(
            r"SELECT class_code FROM enrollment WHERE class_code = :class_code", 
            params! {
                "class_code" => class_code_str.clone(),
            },
        ).map_err(|e| format!("Failed to check if enrollment exists: {}", e))?;

        if enrollment_exists.is_none(){
            conn.exec_drop(
                r"INSERT INTO enrollment (class_code, nim, subject_code)
                VALUES (:class_code, :nim, :subject_code)", 
                params! {
                    "class_code" => enrollment.class_code_str,
                    "nim" => enrollment.nim,
                    "subject_code" => enrollment.subject_code,
                },
            ).map_err(|e| format!("Failed to insert enrollment: {}", e))?;
        }
    }
    Ok(())
}

#[tauri::command]
async fn insert_subject(conn: &mut PooledConn) -> Result<(), String> {
    let subjects = get_all_subject().await.map_err(|_| "Failed to fetch subject".to_string())?;

    for subject in subjects {
        let subject_code_str = subject.subject_code_str.clone();

        let subject_exists: Option<String> = conn.exec_first(
            r"SELECT subject_code FROM subject WHERE subject_code = :subject_code", 
            params! {
                "subject_code" => subject_code_str.clone(),                
            },
        ).map_err(|e| format!("Subject not exists check not working: {}", e))?;

        if subject_exists.is_none() {
            conn.exec_drop(
                r"INSERT INTO subject (subject_code, subject_name)
                VALUES (:subject_code, :subject_name)", 
                params! {
                    "subject_code" => subject.subject_code_str,
                    "subject_name" => subject.subject_name,
                },
            ).map_err(|e| format!("failet to insert subject : {}", e))?;
        }
    }
    Ok(())
}


#[tauri::command]
async fn insert_exam_transaction(
    mysql_pool: State<'_, Pool>,
    subject_code_str: String,
    room_number_str: String,
    shift_id: String,
    transaction_date: String,
) -> Result<(), String> {
    let mut conn = mysql_pool.get_conn()
        .map_err(|e| format!("Failed to get connection: {}", e))?;

    let mut transaction = conn.start_transaction(TxOpts::default())
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    let mut rng = rand::thread_rng();
    let transaction_id: String = format!("TI{:04}", rng.gen_range(0..10000));

    transaction.exec_drop(
        r"INSERT INTO exam_transaction (
            transaction_id, subject_code, room_number, shift_id, 
            transaction_date
        ) VALUES (
            :transaction_id, :subject_code, :room_number, :shift_id, 
            :transaction_date
        )",
        params! {
            "transaction_id" => &transaction_id,
            "subject_code" => &subject_code_str,
            "room_number" => &room_number_str,
            "shift_id" => &shift_id,
            "transaction_date" => &transaction_date,
        },
    ).map_err(|e| format!("Failed to execute query: {}", e))?;

    transaction.commit()
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    Ok(())
}

fn create_users_table_if_not_exists(conn: &mut PooledConn) -> Result<(), mysql::Error> {
    conn.exec_drop(
        r"CREATE TABLE IF NOT EXISTS users (
            bn_number VARCHAR(255) PRIMARY KEY,
            nim VARCHAR(255) UNIQUE,
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

fn create_enrollment_table_if_not_exists(conn: &mut PooledConn) -> Result<(), mysql::Error> {
    conn.exec_drop(
        r"CREATE TABLE IF NOT EXISTS enrollment (
            class_code VARCHAR(255) PRIMARY KEY,
            nim VARCHAR(255) NOT NULL,
            subject_code VARCHAR(255) NOT NULL,
            FOREIGN KEY (nim) REFERENCES users(nim),
            FOREIGN KEY (subject_code) REFERENCES subject(subject_code)
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
            transaction_id VARCHAR(50) PRIMARY KEY,
            subject_code VARCHAR(50) NOT NULL,
            room_number VARCHAR(255) NOT NULL,
            shift_id VARCHAR(1) NOT NULL,
            transaction_date DATE NOT NULL,
            transaction_time TIME,
            seat_number VARCHAR(50),
            status VARCHAR(50),
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
        create_enrollment_table_if_not_exists(&mut conn).expect("Failed to create enrollment table");
        create_subject_table_if_not_exists(&mut conn).expect("Failed to create subject table");
        create_exam_transaction_if_not_exists(&mut conn).expect("Failed to create exam transaction");

        task::block_on(async {
            insert_users(&mut conn).await.expect("Failed to insert users");
            insert_room(&mut conn).await.expect("Failed to insert rooms");
            insert_subject(&mut conn).await.expect("Failed to insert subject");
            insert_enrollment(&mut conn).await.expect("Failed to insert enrollment");
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
            get_all_enrollment,
            get_all_shifts,
            get_password_by_nim,
            change_password,
            edit_role,
            get_room_transaction,
            get_exam_transaction,
            insert_exam_transaction
        ])
        .run(tauri::generate_context!())
        .expect("Error while running Tauri application");
}