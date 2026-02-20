## Introduction
Artgine is a 2D/3D content engine and an integrated development environment built with Electron and web technologies. It combines web‑based graphics rendering with the convenience of a desktop app, so you can build interactive content and games without complex setup.

> Language **[한국어](https://github.com/06fs4dix/Artgine/blob/main/README-ko.md)**

## Examples

**3D**

[Water](https://06fs4dix.github.io/Artgine/proj/Tutorial/Water/Water.html) : Water

[ModularVillage](https://06fs4dix.github.io/Artgine/proj/3D/ModularVillage/ModularVillage.html) : Village

[Voxel](https://06fs4dix.github.io/Artgine/proj/3D/Voxel/Voxel.html) : Voxel

**2D**

[Village](https://06fs4dix.github.io/Artgine/proj/2D/Village/Village.html) : Village 

[Maze](https://06fs4dix.github.io/Artgine/proj/2D/Maze/Maze.html) : Maze



<details>
  <summary>More examples</summary>

[ArtgineTutorial](https://06fs4dix.github.io/Artgine/proj/Tutorial/Canvas/Canvas.html) : A guided tutorial on how to use Artgine.

[CollusionTest](https://06fs4dix.github.io/Artgine/proj/Tutorial/Collusion/Collusion.html): Collision testing.  

[3DLight](https://06fs4dix.github.io/Artgine/proj/Tutorial/3DLight/3DLight.html): 3D lights and shadows.

[Map](https://06fs4dix.github.io/Artgine/proj/3D/Map/Map.html): Track 3D objects from a 2D map.  

[BoxShow](https://06fs4dix.github.io/Artgine/proj/3D/BoxShow/BoxShow.html) : Box visual viewer

[Shooting](https://06fs4dix.github.io/Artgine/proj/2D/Shooting/Shooting.html) : Shooting

[Up](https://06fs4dix.github.io/Artgine/proj/2D/SideScroll/SideScroll.html) : Up

[Skybox](https://06fs4dix.github.io/Artgine/proj/Tutorial/Skybox/Skybox.html) : Skybox

</details>

## Getting Started

- Run `start.bat` (Windows) or `start.sh` (Linux).  
  💡 You may see an **“Unknown publisher”** warning.
- Or run the following in your console:
```bash
git clone https://github.com/06fs4dix/Artgine.git
cd Artgine
npm install
npm start
```
To run **only the server**, use `npm run start_web` instead of `npm start`.

### Folder Overview
```
├── README.md
├── LICENSE.txt
├── NOTICE.txt
├── package.json
├── start.bat       (Windows launch script)
├── start.sh        (Linux launch script)
├── tsconfig.json
├── App/            (Electron files)
├── artgine/        (Engine files)
├── db/             (Database storage path)
├── plugin/
└── proj/           (Project files)
```
> 🚫 Do **not** place your project folder above the working directory.

### Electron

![Artgine App](https://06fs4dix.github.io/Artgine/help/Artgine.png)

**Tabs**
- **App**: Application run settings
- **Preference**: Project configuration
- **Include**: Project include file settings
- **Manifest**: PWA configuration
- **ServiceWorker**: Cache settings
- **Plugin**: External libraries for Artgine
  
**App Tab**
- **url**: The web server address to run  
  - Example: `http://localhost:8050/Artgine`
- **projectPath**: Project to launch  
  - Example: `proj/Tutorial/ShaderEditer`
- Use the **Folder** button to browse and select a project directory.
- **width, height**: Initial window size  
  - Example: `1024 x 768`  
  - Note: Preserved only when running as an `.exe`.

**Program Modes**
- **program**: App role  
  - `developer`: Developer mode (do **not** distribute; server and client are applied together)
  - `client`: Client mode
  - `server`: Web server mode

**Server Configuration**
- **server**: Server operation mode  
  - `local`: File‑based local run
  - `remote`: Connect to an external server
  - `webserver`: Host a web server (allow external access)

**Display Options**
- **fullScreen**: Fullscreen mode
- **github**: Run using the GitHub library  
  - Creates a local Chrome launcher (.bat) in the project

**Actions**
- **Run**: Launch the application
- **VSCode**: Open in Visual Studio Code

### Running a Project
1. In **projectPath**, click **Folder** and select a folder under `proj`.
2. Click **Run (F9)** or use the shortcut to load the project.

## Coding

When running as an Electron app:  
> 💡 **Note**: If you’re working manually, you’re free to edit your code.

> 🚫 The following files are **auto‑generated and managed** based on **[Project Name]**. Edit with care:
- **[Project Name]** HTML files
- **[Project Name]** TypeScript files
- **[Project Name]** JSON files
- **[Project Name]** Web Manifest files

**📝 What you can safely edit**  
Only edit code **after the `EntryPoint`**. Example:
```js
// The content above this line is automatically set by the program. Do not modify. ⬆✋🚫⬆☠️💥🔥
// EntryPoint
// You can edit from here.
```

Avoid modifying auto‑generated code.

## GPT
[Artgine BOT](https://chatgpt.com/g/g-68ad603d9b3081918273f3d352f995fc-artgine-bot): Ask questions in real time using the pre‑trained Artgine GPT bot.
