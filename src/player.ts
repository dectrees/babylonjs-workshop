import { AnimationGroup, ArcRotateCamera, FollowCamera, Mesh, MeshBuilder, Nullable, Quaternion, Scalar, Scene, SceneLoader, Tools, Vector3 } from "@babylonjs/core";
import Game from "./game";
import "@babylonjs/loaders";
import HeroController from "./heroController";

export default class Player {
    game: Game;
    scene: Scene;
    assets;
    mesh: Mesh;
    // private heroController: HeroController;
    heroSpeed = 0.03;
    heroSpeedBackwards = 0.01;
    heroRotationSpeed = 0.05;


    private cameraArc: ArcRotateCamera;
    private cameraFollow: FollowCamera;
    currentCamera: ArcRotateCamera | FollowCamera;
    alpha: number;
    mouseRightKeyDown: boolean = false;
    angleFollowTarget: number = 0;
    angleFollowStep: number = 0;
    angleFollowDone: number = 0;

    walkAnim: Nullable<AnimationGroup> = null;
    walkBackAnim: Nullable<AnimationGroup> = null;
    idleAnim: Nullable<AnimationGroup> = null;
    sambaAnim: Nullable<AnimationGroup> = null;

    constructor(game: Game) {
        this.game = game;
        this.scene = game.scene;

        this.cameraArc = this.initArcCamera(this.scene);
        this.cameraFollow = this.initFollowCamera(this.scene);

        new HeroController(this);
        this.loadModel(this.scene).then(() => {
            this.scene.onBeforeRenderObservable.add(() => {
                this._updateFrame();
            });
        }
        );
    }
    private _updateFrame() {

        if (this.currentCamera instanceof ArcRotateCamera && this.mouseRightKeyDown) {
            let source = this.mesh.rotationQuaternion;
            // console.log("mesh rotationQuaternion:",source);
            if (source) {
                this.alpha = this.currentCamera.alpha;
                // console.log("alpha:",Tools.ToDegrees(this.alpha));
                let target = Quaternion.FromEulerAngles(0, 3 * Math.PI / 2 - this.alpha, 0);
                this.mesh.rotationQuaternion = Quaternion.Slerp(source, target, 0.2);

            }
            else {
                console.log("source is null");
            }
        }
        // if (this.currentCamera instanceof FollowCamera) {
        //     if (this.angleFollowDone < this.angleFollowTarget) {
        //         this.angleFollowStep = Scalar.Lerp(this.angleFollowStep, this.angleFollowTarget, 0.3);
        //         this.mesh.rotate(Vector3.Up(), this.angleFollowStep);
        //         console.log("rotation step:",this.angleFollowStep);
        //         this.angleFollowDone += this.angleFollowStep;
        //     }
        // }

    }

    rotate(a: number) {
        this.mesh.rotate(Vector3.Up(), a);
        // this.angleFollowTarget = a;
        // console.log("rotate target:",this.angleFollowTarget);
    }


    //ArcRotateCamera
    private initArcCamera(scene: Scene): ArcRotateCamera {
        var camera1 = new ArcRotateCamera("camera1", Math.PI / 2, Math.PI / 2, 10, new Vector3(0, 2, 0), scene);
        camera1.lowerRadiusLimit = 5;
        camera1.upperRadiusLimit = 30;
        camera1.upperBetaLimit = Math.PI / 2.1;
        camera1.lowerBetaLimit = Math.PI / 4;
        camera1.wheelDeltaPercentage = 0.01;
        return camera1;
    }

    private initFollowCamera(scene: Scene): FollowCamera {
        var camera = new FollowCamera("tankFollowCamera", new Vector3(10, 0, 10), scene);
        camera.heightOffset = 3;
        camera.rotationOffset = 180;
        camera.cameraAcceleration = .1;
        camera.maxCameraSpeed = 1;
        camera.radius = 8;

        camera.inputs.removeByType('FollowCameraPointersInput');
        return camera;

    }

    switchCamera() {
        if (this.currentCamera instanceof FollowCamera) {
            this.cameraArc.attachControl(this.game.canvas, true);
            this.cameraArc._panningMouseButton = 1;
            this.scene.activeCamera = this.cameraArc;
            this.currentCamera = this.cameraArc;
            this.currentCamera.lockedTarget = this.mesh;
        }
        else {
            this.cameraFollow.attachControl(true);
            this.scene.activeCamera = this.cameraFollow;
            this.currentCamera = this.cameraFollow;
            this.currentCamera.rotationOffset = 180;
            this.currentCamera.lockedTarget = this.mesh;
        }
    }

    private async loadModel(scene: Scene): Promise<void> {
        this.assets = await this.loadCharacter(scene);
        this.mesh = this.assets.mesh;
        //load animation
        this.walkAnim = this.assets.animationGroups[2];
        this.walkBackAnim = this.assets.animationGroups[3];
        this.idleAnim = this.assets.animationGroups[0];
        this.sambaAnim = this.assets.animationGroups[1];

        this.cameraArc.attachControl(this.game.canvas, true);
        this.cameraArc._panningMouseButton = 1;
        this.currentCamera = this.cameraArc;
        this.currentCamera.lockedTarget = this.mesh;
        scene.activeCamera = this.cameraArc;
    }

    private async loadCharacter(scene: Scene): Promise<any> {
        const outer = MeshBuilder.CreateBox("outer", { width: 2, depth: 1, height: 3 }, scene);
        outer.isVisible = false;
        outer.isPickable = false;
        outer.checkCollisions = true;

        //move origin of box collider to the bottom of the mesh (to match player mesh)
        // outer.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0))
        outer.position.y += 1.5;
        //for collisions
        outer.ellipsoid = new Vector3(1, 1.5, 1);
        outer.ellipsoidOffset = new Vector3(0, 1.5, 0);

        outer.rotationQuaternion = new Quaternion(0, 1, 0, 0);
        // outer.rotationQuaternion = Quaternion.FromEulerAngles(0,Math.PI,0);
        // console.log("outer rotationQuaternion:",outer.rotationQuaternion);
        const result = await SceneLoader.ImportMeshAsync(null, "https://assets.babylonjs.com/meshes/", "HVGirl.glb", scene);
        const root = result.meshes[0];
        root.scaling.scaleInPlace(0.1);
        //body is our actual player mesh
        const body = root;
        body.position.y -= 1.5;
        body.parent = outer;
        body.isPickable = false;
        // console.log("quaternion outer: ",outer.rotationQuaternion);
        // console.log("outer rotation Y: ",outer.rotation.y);
        body.getChildMeshes().forEach(m => {
            m.isPickable = false;
        })

        //return the mesh and animations
        return {
            mesh: outer as Mesh,
            animationGroups: result.animationGroups
        }
    }

    play(act: string) {
        switch (act) {
            case "idle":
                this.idleAnim?.start(true, 1.0, this.idleAnim.from, this.idleAnim.to, false);
                break;
            case "samba":
                this.sambaAnim?.start(true, 1.0, this.sambaAnim.from, this.sambaAnim.to, false);
                break;
            case "forward":
                this.walkAnim?.start(true, 1.0, this.walkAnim.from, this.walkAnim.to, false);
                break;
            case "back":
                this.walkBackAnim?.start(true, 1.0, this.walkBackAnim.from, this.walkBackAnim.to, false);
                break;
        }
    }
    stop() {
        this.sambaAnim?.stop();
        this.walkAnim?.stop();
        this.walkBackAnim?.stop();
    }

    move(act: string) {
        switch (act) {
            case "w":
                this.mesh.moveWithCollisions(this.mesh.forward.scaleInPlace(this.heroSpeed));
                break;
            case "s":
                this.mesh.moveWithCollisions(this.mesh.forward.scaleInPlace(-this.heroSpeedBackwards));
                break;
            case "a":
                this.mesh.rotate(Vector3.Up(), -this.heroRotationSpeed);
                break;
            case "d":
                this.mesh.rotate(Vector3.Up(), this.heroRotationSpeed);
                break;
        }
    }

}