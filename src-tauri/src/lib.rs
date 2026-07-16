use sysinfo::System;


#[derive(serde::Serialize)]
struct Disco {
  nombre: String,
  espacio_libre: u64,
}

#[tauri::command]
fn obtener_ram() -> u64 {
  let mut sistema = System::new_all();
  sistema.refresh_all();
  sistema.total_memory() / 1024 / 1024 / 1024
}

#[tauri::command]
fn obtener_cpus() -> u32 {
  let mut sistema = System::new_all();
  sistema.refresh_all();
  sistema.cpus().len() as u32
}

#[tauri::command]
fn obtener_discos() -> Vec<Disco> {
  use sysinfo::Disks;
  let discos = Disks::new_with_refreshed_list();
  discos.iter().map(|d| Disco {
  nombre: {
    let nombre_volumen = d.name().to_string_lossy().to_string();
    if nombre_volumen.is_empty() {
        d.mount_point().to_string_lossy().to_string()
    } else {
        nombre_volumen
    }
  },
  espacio_libre: d.available_space() / 1024 / 1024 / 1024,
}).collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
  .plugin(tauri_plugin_store::Builder::default().build())
  .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![obtener_ram, obtener_discos, obtener_cpus])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}