This sample lets you explore various **lighting**, **shadow** techniques, and a **skybox** in a 3D environment.

## How to Use

Open the app’s **Help** panel and select each mode to see how it works.

- **ShadowPlane**: Projects shadows onto a plane aligned with the Y‑axis.
- **Forward**: Generates and applies a **shadow map** using forward rendering.
- **Deferred**
  - **Single**: Uses the **Half‑Lambert + Phong** lighting model.  
    Adds depth with **parallax** rendering.  
    Performs multiple render passes and **bakes** each result into textures.
  - **Multi**: Outputs multiple attributes in a single render (G‑buffer style).  
    Uses **PBR** and adds skybox‑based **ambient** lighting.

