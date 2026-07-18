use sysinfo::System;
use kube::{Client, Api};
use kube::api::PostParams;
use k8s_openapi::api::core::v1::{
    Pod,
    Service
};
use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;


#[derive(serde::Serialize)]
struct Disco {
  nombre: String,
  espacio_libre: u64,
}

#[derive(serde::Serialize)]
struct ServidorCreado {
    nombre: String,
    puerto: u16,
}

#[tauri::command]
async fn iniciar_playit(
    app: tauri::AppHandle,
    secret: String
) -> Result<String, String> {

   println!("SECRET RECIBIDA: {}", secret);

    let (mut rx, _child) = app
        .shell()
        .sidecar("playit")
        .map_err(|e| e.to_string())?
        .args(["--secret", &secret])
        .spawn()
        .map_err(|e| e.to_string())?;

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    println!(
                        "PLAYIT: {}",
                        String::from_utf8_lossy(&line)
                    );
                }

                CommandEvent::Stderr(line) => {
                    println!(
                        "PLAYIT ERROR: {}",
                        String::from_utf8_lossy(&line)
                    );
                }

                _ => {}
            }
        }
    });

    Ok("playit iniciado".to_string())
}

#[tauri::command]
async fn crear_servidor(
  nombre: String,
  version: String,
  tipo: String,
  ram: f64,
  cpus: f64,
  almacenamiento: f64,
  disco: String,
  modo_pirata: bool,
  mods: Vec<String>,
  plugins: Vec<String>,
) -> Result<String, String> {

  let client = Client::try_default()
      .await
      .map_err(|e| e.to_string())?;

  let pods: Api<Pod> = Api::default_namespaced(client.clone());

  let memoria_mb = (ram * 1024.0).round() as u32;

  let pod: Pod = serde_json::from_value(serde_json::json!({
    "apiVersion": "v1",
    "kind": "Pod",
    "metadata": {
      "name": nombre,
      "labels": {
        "app": nombre
      }
    },
    "spec": {
      "containers": [{
        "name": "minecraft",
        "image": "itzg/minecraft-server",
        "env": [
          {"name": "EULA", "value": "TRUE"},
          {"name": "VERSION", "value": version},
          {"name": "TYPE", "value": tipo},
          {"name": "MEMORY", "value": format!("{}M", memoria_mb)},
          {"name": "ONLINE_MODE", "value": if modo_pirata { "false" } else { "true" }},
          {"name": "MODRINTH_PROJECTS", "value": mods.join(",")},
          {"name": "PLUGINS", "value": plugins.join(",")}
        ],
        "ports": [{
          "containerPort": 25565
        }],
        "resources": {
          "limits": {
            "cpu": format!("{}", cpus),
            "memory": format!("{}Gi", ram)
          }
        }
      }]
    }
  }))
  .map_err(|e| e.to_string())?;


  // Crear Pod
  pods.create(&PostParams::default(), &pod)
      .await
      .map_err(|e| e.to_string())?;


  // Crear Service
  let services: Api<Service> = Api::default_namespaced(client.clone());

  let service: Service = serde_json::from_value(serde_json::json!({
    "apiVersion": "v1",
    "kind": "Service",
    "metadata": {
      "name": format!("{}-service", nombre)
    },
    "spec": {
      "type": "NodePort",
      "selector": {
        "app": nombre
      },
      "ports": [{
        "port": 25565,
        "targetPort": 25565
      }]
    }
  }))
  .map_err(|e| e.to_string())?;


  let servicio_creado = services
    .create(&PostParams::default(), &service)
    .await
    .map_err(|e| e.to_string())?;
  
  let puerto = servicio_creado
    .spec
    .as_ref()
    .and_then(|spec| spec.ports.as_ref())
    .and_then(|ports| ports.first())
    .and_then(|port| port.node_port)
    .ok_or("No se pudo obtener el NodePort".to_string())?
    as u16;  


Ok(serde_json::to_string(&ServidorCreado {
    nombre,
    puerto,
})
.unwrap())
}

#[tauri::command]
async fn obtener_estado_servidor(nombre: String) -> Result<String, String> {
    let client = Client::try_default().await.map_err(|e| e.to_string())?;
    let pods: Api<Pod> = Api::default_namespaced(client);
    let pod = pods.get(&nombre).await.map_err(|e| e.to_string())?;
    let estado = pod.status
        .and_then(|s| s.phase)
        .unwrap_or("Unknown".to_string());
    Ok(estado)
}

#[tauri::command]
async fn obtener_logs_servidor(nombre: String) -> Result<String, String> {
    let client = Client::try_default().await.map_err(|e| e.to_string())?;
    let pods: Api<Pod> = Api::default_namespaced(client);
    let logs = pods.logs(&nombre, &kube::api::LogParams::default())
        .await
        .map_err(|e| e.to_string())?;
    Ok(logs)
}

#[tauri::command]
async fn crear_tunel_playit(
    nombre: String,
    puerto: u16
) -> Result<String,String> {

    println!(
        "Creando túnel Playit para {} en puerto {}",
        nombre,
        puerto
    );

    // Aquí irá la llamada API de Playit

    Ok("pendiente".to_string())
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
  .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![obtener_ram, obtener_discos, obtener_cpus, crear_servidor,  obtener_estado_servidor, obtener_logs_servidor, iniciar_playit,crear_tunel_playit  ])
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