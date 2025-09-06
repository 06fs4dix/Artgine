# Quick Start

```bash
git clone https://github.com/06fs4dix/Artgine.git
cd Artgine
npm install
npm start
```
> Language **[한국어](https://github.com/06fs4dix/Artgine/blob/main/README-KR.md)**

# Examples

**ArtgineTutorial**: [https://06fs4dix.github.io/Artgine/proj/Tutorial/Canvas/Canvas.html](https://06fs4dix.github.io/Artgine/proj/Tutorial/Canvas/Canvas.html)

<details>
  <summary>More</summary>

**Tutorial**

* CollusionTest: [https://06fs4dix.github.io/Artgine/proj/Tutorial/Collusion/Collusion.html](https://06fs4dix.github.io/Artgine/proj/Tutorial/Collusion/Collusion.html)
* 3DLight: [https://06fs4dix.github.io/Artgine/proj/Tutorial/3DLight/3DLight.html](https://06fs4dix.github.io/Artgine/proj/Tutorial/3DLight/3DLight.html)
* Skybox: [https://06fs4dix.github.io/Artgine/proj/Tutorial/Skybox/Skybox.html](https://06fs4dix.github.io/Artgine/proj/Tutorial/Skybox/Skybox.html)
* Wind: [https://06fs4dix.github.io/Artgine/proj/Tutorial/Wind/Wind.html](https://06fs4dix.github.io/Artgine/proj/Tutorial/Wind/Wind.html)

**3D**

* BoxShow: [https://06fs4dix.github.io/Artgine/proj/3D/BoxShow/BoxShow.html](https://06fs4dix.github.io/Artgine/proj/3D/BoxShow/BoxShow.html)
* Map: [https://06fs4dix.github.io/Artgine/proj/3D/Map/Map.html](https://06fs4dix.github.io/Artgine/proj/3D/Map/Map.html)
* GeometryViewer: [https://06fs4dix.github.io/Artgine/proj/3D/GeometryViewer/GeometryViewer.html](https://06fs4dix.github.io/Artgine/proj/3D/GeometryViewer/GeometryViewer.html)

**2D**

* Maze: [https://06fs4dix.github.io/Artgine/proj/2D/Maze/Maze.html](https://06fs4dix.github.io/Artgine/proj/2D/Maze/Maze.html)
* Village: [https://06fs4dix.github.io/Artgine/proj/2D/Village/Village.html](https://06fs4dix.github.io/Artgine/proj/2D/Village/Village.html)
* Shooting: [https://06fs4dix.github.io/Artgine/proj/2D/Shooting/Shooting.html](https://06fs4dix.github.io/Artgine/proj/2D/Shooting/Shooting.html)

</details>

# Getting Started

## Setup

Run `start.bat` / `start.sh` (you may see an **"Unknown Publisher"** warning) **or**

 enter the following in your console:

```bash
git clone https://github.com/06fs4dix/Artgine.git
cd Artgine
npm install
npm start
```

To run **only the server**, use `npm run start_web` instead of `npm start`.

## Folder Structure

```
├── README.md
├── LICENSE.txt
├── NOTICE.txt
├── package.json
├── start.bat (Windows start batch file)
├── start.sh (Linux start script)
├── tsconfig.json
├── App/ (Electron app files)
├── artgine/ (engine files)
├── db/ (database storage path)
├── plugin/
└── proj/ (project files)
```

${\textsf{\color{Red}🚫 Project files must not be located above the working folder.}}$

# Electron

![Artgine App](https://06fs4dix.github.io/Artgine/help/Artgine.png)

## Tabs

* **App**: Application run settings
* **Preferences**: Project configuration settings
* **Include**: Project include file settings
* **Manifest**: PWA configuration
* **ServiceWorker**: Cache settings
* **Plugin**: External libraries for Artgine

## App Tab

* **url**: Web server address to run

  * Example: `http://localhost:8050/Artgine`
* **projectPath**: Project to start

  * Example: `proj/Tutorial/ShaderEditer`
* Use the **Folder** button to browse and select a project directory
* **width, height**: Initial window size

  * Example: `1024 x 768`
  * Note: Only preserved when running as a standalone `.exe`

### Program Mode

* **program**: Program role

  * `developer`: Developer mode (**do not distribute** / server and client applied simultaneously)
  * `client`: Client mode
  * `server`: Web server mode

### Server Configuration

* **server**: How to run the server

  * `local`: File-based local run
  * `remote`: Connect to an external server
  * `webserver`: Run a web server (allow external access)

### Display Options

* **fullScreen**: Fullscreen mode
* **github**: Run using GitHub libraries

  * Generates a Chrome local run `.bat` in the project

### Actions

* **Run**: Launch the application
* **VSCode**: Open in Visual Studio Code

# Writing Code

When running via the Electron app:

> **Note:** If you work manually, you can freely modify files.

${\textsf{\color{Red}🚫The following files are auto-generated and managed based on the project folder name. Edit with caution.}}$ 


* HTML files
* TypeScript files
* JSON files
* Web Manifest file

**📝 Editable Scope**

Only code **after the EntryPoint** can be modified. Do **not** touch auto-generated code.
