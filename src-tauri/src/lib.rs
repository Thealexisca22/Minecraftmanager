use sysinfo::System;
use kube::{Client, Api};
use kube::api::{PostParams};
use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use std::process::Command;
use k8s_openapi::api::apps::v1::Deployment;
use k8s_openapi::api::core::v1::{Pod, Service, PersistentVolumeClaim};

#[derive(serde::Serialize)]
struct Disco {
  nombre: String,
  espacio_libre: u64,
}

#[tauri::command]
async fn comprobar_minikube() -> Result<bool, String> {

    let resultado = Command::new("minikube")
        .args(["status", "--output=json"])
        .output()
        .map_err(|e| e.to_string())?;


    if !resultado.status.success() {
        return Ok(false);
    }


    let salida = String::from_utf8_lossy(&resultado.stdout);


    if salida.contains("\"Host\": \"Running\"")
        && salida.contains("\"Kubelet\": \"Running\"")
    {
        Ok(true)
    } else {
        Ok(false)
    }
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
  let client = Client::try_default().await.map_err(|e| e.to_string())?;
  let memoria_mb = (ram * 1024.0).round() as u32;

  // Crear PVC
  let pvcs: Api<PersistentVolumeClaim> = Api::default_namespaced(client.clone());
  let pvc: PersistentVolumeClaim = serde_json::from_value(serde_json::json!({
    "apiVersion": "v1",
    "kind": "PersistentVolumeClaim",
    "metadata": { "name": format!("{}-pvc", nombre) },
    "spec": {
      "accessModes": ["ReadWriteOnce"],
      "resources": {
        "requests": {
          "storage": format!("{}Gi", almacenamiento.round() as u32)
        }
      },
      "storageClassName": "standard"
    }
  })).map_err(|e| e.to_string())?;
  pvcs.create(&PostParams::default(), &pvc).await.map_err(|e| e.to_string())?;

  // Crear Deployment con 0 réplicas
  let deployments: Api<Deployment> = Api::default_namespaced(client.clone());
  let deployment: Deployment = serde_json::from_value(serde_json::json!({
    "apiVersion": "apps/v1",
    "kind": "Deployment",
    "metadata": {
      "name": nombre,
      "labels": { "app": nombre }
    },
    "spec": {
      "replicas": 0,
      "selector": { "matchLabels": { "app": nombre } },
      "template": {
        "metadata": { "labels": { "app": nombre } },
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
            "ports": [{ "containerPort": 25565 }],
            "resources": {
              "limits": {
                "cpu": format!("{}", cpus),
                "memory": format!("{}Mi", memoria_mb)
              }
            },
            "volumeMounts": [{
              "name": "data",
              "mountPath": "/data"
            }]
          }],
          "volumes": [{
            "name": "data",
            "persistentVolumeClaim": {
              "claimName": format!("{}-pvc", nombre)
            }
          }]
        }
      }
    }
  })).map_err(|e| e.to_string())?;
  deployments.create(&PostParams::default(), &deployment).await.map_err(|e| e.to_string())?;

  // Crear Service
  let services: Api<Service> = Api::default_namespaced(client.clone());
  let service: Service = serde_json::from_value(serde_json::json!({
    "apiVersion": "v1",
    "kind": "Service",
    "metadata": { "name": format!("{}-service", nombre) },
    "spec": {
      "type": "NodePort",
      "selector": { "app": nombre },
      "ports": [{ "port": 25565, "targetPort": 25565 }]
    }
  })).map_err(|e| e.to_string())?;

  let servicio_creado = services.create(&PostParams::default(), &service).await.map_err(|e| e.to_string())?;

  let puerto = servicio_creado
    .spec.as_ref()
    .and_then(|s| s.ports.as_ref())
    .and_then(|p| p.first())
    .and_then(|p| p.node_port)
    .ok_or("No se pudo obtener el puerto".to_string())?;

  Ok(puerto.to_string())
}

#[tauri::command]
async fn arrancar_servidor(nombre: String) -> Result<String, String> {
    let client = Client::try_default().await.map_err(|e| e.to_string())?;
    let deployments: Api<Deployment> = Api::default_namespaced(client);
    
    let patch = serde_json::json!({
        "spec": { "replicas": 1 }
    });
    
    deployments.patch(
        &nombre,
        &kube::api::PatchParams::default(),
        &kube::api::Patch::Merge(&patch)
    ).await.map_err(|e| e.to_string())?;
    
    Ok("Servidor arrancado".to_string())
}

#[tauri::command]
async fn parar_servidor(nombre: String) -> Result<String, String> {
    let client = Client::try_default().await.map_err(|e| e.to_string())?;
    let deployments: Api<Deployment> = Api::default_namespaced(client);
    
    let patch = serde_json::json!({
        "spec": { "replicas": 0 }
    });
    
    deployments.patch(
        &nombre,
        &kube::api::PatchParams::default(),
        &kube::api::Patch::Merge(&patch)
    ).await.map_err(|e| e.to_string())?;
    
    Ok("Servidor parado".to_string())
}

fn es_error_no_encontrado(e: &kube::Error) -> bool {
    if let kube::Error::Api(ae) = e {
        ae.code == 404
    } else {
        false
    }
}

#[tauri::command]
async fn borrar_servidor(nombre: String) -> Result<String, String> {
    let client = Client::try_default().await.map_err(|e| e.to_string())?;

    let deployments: Api<Deployment> = Api::default_namespaced(client.clone());
    if let Err(e) = deployments.delete(&nombre, &kube::api::DeleteParams::default()).await {
        if !es_error_no_encontrado(&e) {
            return Err(e.to_string());
        }
    }

    let services: Api<Service> = Api::default_namespaced(client.clone());
    if let Err(e) = services.delete(&format!("{}-service", nombre), &kube::api::DeleteParams::default()).await {
        if !es_error_no_encontrado(&e) {
            return Err(e.to_string());
        }
    }

    let pvcs: Api<PersistentVolumeClaim> = Api::default_namespaced(client.clone());
    if let Err(e) = pvcs.delete(&format!("{}-pvc", nombre), &kube::api::DeleteParams::default()).await {
        if !es_error_no_encontrado(&e) {
            return Err(e.to_string());
        }
    }

    Ok("Servidor borrado".to_string())
}

#[tauri::command]
async fn obtener_estado_servidor(nombre: String) -> Result<String, String> {
    let client = Client::try_default().await.map_err(|e| e.to_string())?;
    let deployments: Api<Deployment> = Api::default_namespaced(client);

    let deployment = match deployments.get(&nombre).await {
        Ok(d) => d,
        Err(e) => {
            if es_error_no_encontrado(&e) {
                return Ok("No encontrado".to_string());
            }
            return Err(e.to_string());
        }
    };

    let replicas = deployment.spec
        .as_ref()
        .and_then(|s| s.replicas)
        .unwrap_or(0);

    let disponibles = deployment.status
        .as_ref()
        .and_then(|s| s.available_replicas)
        .unwrap_or(0);

    if replicas == 0 {
        Ok("Parado".to_string())
    } else if disponibles > 0 {
        Ok("Running".to_string())
    } else {
        Ok("Iniciando".to_string())
    }
}

#[tauri::command]
async fn obtener_logs_servidor(nombre: String) -> Result<String, String> {
    let client = Client::try_default().await.map_err(|e| e.to_string())?;
    let pods: Api<Pod> = Api::default_namespaced(client);
    
    let params = kube::api::ListParams::default()
        .labels(&format!("app={}", nombre));
    
    let lista = pods.list(&params).await.map_err(|e| e.to_string())?;
    
    let pod = lista.items.into_iter().next()
        .ok_or("No hay pods corriendo".to_string())?;
    
    let nombre_pod = pod.metadata.name
        .ok_or("Pod sin nombre".to_string())?;
    
    let logs = pods.logs(&nombre_pod, &kube::api::LogParams::default())
        .await
        .map_err(|e| e.to_string())?;
    
    Ok(logs)
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
async fn obtener_ip_minikube() -> Result<String, String> {
    use tokio::process::Command;

    let salida = Command::new("minikube")
        .arg("ip")
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if !salida.status.success() {
        return Err("No se pudo obtener la IP de Minikube".to_string());
    }

    Ok(String::from_utf8_lossy(&salida.stdout).trim().to_string())
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

#[tauri::command]
async fn iniciar_minikube(
    ram: u64,
    cpus: u32,
) -> Result<String, String> {

    let resultado = Command::new("minikube")
        .args([
            "start",
            "--memory",
            &format!("{}", ram * 1024),
            "--cpus",
            &format!("{}", cpus),
        ])
        .output()
        .map_err(|e| e.to_string())?;


    if resultado.status.success() {
        Ok("Minikube iniciado correctamente".to_string())
    } else {
        Err(
            String::from_utf8_lossy(&resultado.stderr)
            .to_string()
        )
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
  .plugin(tauri_plugin_store::Builder::default().build())
  .plugin(tauri_plugin_dialog::init())
  .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![obtener_ram, obtener_discos, obtener_cpus, crear_servidor,  obtener_estado_servidor, obtener_logs_servidor,  obtener_ip_minikube, 
        iniciar_minikube,  comprobar_minikube, arrancar_servidor, parar_servidor, borrar_servidor])
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