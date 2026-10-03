# 🔧 Arreglos para Android APK

## ✅ Cambios Aplicados a tu Proyecto

### 1️⃣ **Botón Atrás (Back Button) - Sincronización Android ↔ JavaScript**

El app ahora maneja correctamente el botón atrás del sistema:

**Flujo:**
1. Presionas atrás → Se ejecuta `LSL._handleAndroidBack()` desde Java
2. Si hay modal/menú abierto → lo cierra
3. Si estás en otra pestaña → vuelve a la anterior  
4. En pantalla principal → muestra **"Presioná de nuevo para salir"**
5. Segundo atrás → cierra la app

**Archivos modificados:**
- ✅ `js/app.js` — Nueva función `LSL._handleAndroidBack()`

---

### 2️⃣ **APK Release Firmado (Soluciona Error de Actualización)**

**El problema anterior:**
- Compilabas con `assembleDebug` (APK sin firmar)
- Android no permite actualizar un APK debug
- Debías **borrar la app** antes de instalar la nueva versión

**La solución:**
El workflow de GitHub ahora:

✅ Genera un **keystore de firma** automáticamente  
✅ Compila **APK release** con firma válida  
✅ Incrementa `versionCode` automáticamente (basado en GITHUB_RUN_NUMBER)  
✅ Actualiza `versionName` a `2.1.0`

**Resultado:** Ahora puedes **actualizar directamente** sin borrar la app.

---

## 📝 Cómo Usar

### Opción 1: Con GitHub Actions (Recomendado)

1. Sube los cambios a tu repositorio:
   ```bash
   git add -A
   git commit -m "Arreglos: botón atrás + APK release firmado"
   git push origin main
   ```

2. GitHub Actions compila automáticamente:
   - Genera `release.keystore` (1ª vez)
   - Genera APK release → **SuperLiga-APK-v{número}**
   - Descárgalo desde Actions → Artifacts

3. **Listo.** Los usuarios pueden actualizar directamente.

### Opción 2: Compilar Localmente en tu Celular (Acode)

1. Descarga el keystore que genera GitHub Actions (desde Artifacts)
2. O genera uno tú en terminal:
   ```bash
   keytool -genkey -v -keystore release.keystore \
     -keyalg RSA -keysize 2048 -validity 10000 -alias superliga \
     -dname "CN=La Super Liga,O=Liga,C=AR" \
     -storepass "superliga2024" -keypass "superliga2024"
   ```
3. Compila con `./gradlew assembleRelease`

---

## 🎯 Comportamiento Esperado

### ANTES (Problemas) ❌
```
Presionas atrás → App se cierra sin confirmación
Intentas actualizar → "Error de paquete" / "Aplicaciones incompatibles"
Solución → Borrar app + reinstalar
```

### DESPUÉS (Solucionado) ✅
```
Presionas atrás → "Presioná de nuevo para salir" ✓
Presionas otra vez → App se cierra ordenadamente ✓
Actualizas → Se instala sin conflictos ✓
```

---

## 🔐 Seguridad & Detalles Técnicos

| Aspecto | Antes | Ahora |
|--------|-------|-------|
| **Tipo APK** | Debug (sin firmar) | Release (firmado) |
| **Actualización** | No permitida | ✅ Permitida |
| **versionCode** | Fijo (1) | Dinámico (1000+) |
| **versionName** | 1.0 | 2.1.0 |
| **Keystore** | — | superliga2024 |

### Credenciales del Keystore (generado por GitHub):
- **Alias:** `superliga`
- **Password:** `superliga2024`
- **Válido por:** 10,000 días (≈ 27 años)

> **⚠️ Nota:** Es un keystore **público/de prueba**. Si necesitas producción de verdad, crea uno privado y guárdalo.

---

## 📂 Archivos Modificados

```
✅ android-build.yml      → Signing + versionCode + assembleRelease
✅ js/app.js              → LSL._handleAndroidBack()
📝 ANDROID_FIXES.md       ← Este archivo
```

---

## ❓ Preguntas Frecuentes

**P: ¿Necesito hacer algo más en GitHub?**
R: No, sube los cambios y el workflow hace todo.

**P: ¿Qué pasa si el usuario tiene la versión 1.0 instalada?**
R: Android reconoce `versionCode` mayor → actualiza automáticamente.

**P: ¿Se pierde la configuración del usuario al actualizar?**
R: No, la app usa `localStorage` que persiste.

**P: ¿Qué es versionCode vs versionName?**
- **versionCode:** número interno de Android (1000, 1001, 1002...)
- **versionName:** texto visible al usuario (2.1.0)

