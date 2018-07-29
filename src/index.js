import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  MeshStandardMaterial,
  Mesh,
  PlaneGeometry,
  SpotLight,
  Vector3,
  AnimationMixer,
  AnimationClip,
  LoopOnce,
} from 'three';
import GLTFLoader from 'three-gltf-loader';

const TAU = 2 * Math.PI;

const scene = new Scene();
const camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
const renderer = new WebGLRenderer();
renderer.physicallyCorrectLights = true;
renderer.setSize(window.innerWidth, window.innerHeight);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.render(scene, camera);
});
document.body.appendChild(renderer.domElement);

const floorMat = new MeshStandardMaterial({ color: 0x442200 });
floorMat.metalness = 0.0;
floorMat.roughness = 0.8;
const floor = new Mesh(
  new PlaneGeometry(100, 100, 50, 50),
  floorMat
);
floor.rotation.x -= 0.25 * TAU;
scene.add(floor);

const SPOT_COLOR = 0xaaaaaa;
const spot1 = new SpotLight(SPOT_COLOR);
const spot2 = new SpotLight(SPOT_COLOR);
const spot3 = new SpotLight(SPOT_COLOR);
const spot4 = new SpotLight(SPOT_COLOR);
scene.add(spot1);
scene.add(spot2);
scene.add(spot3);
scene.add(spot4);
spot1.power = spot2.power = spot3.power = spot4.power = 4 * Math.PI;
spot1.position.set(50, 10, 50);
spot2.position.set(-50, 10, 50);
spot3.position.set(-50, 10, -50);
spot4.position.set(50, 10, -50);
spot1.lookAt(0, 0, 0);
spot2.lookAt(0, 0, 0);
spot3.lookAt(0, 0, 0);
spot4.lookAt(0, 0, 0);

camera.position.set(25, 26, 25);
camera.lookAt(new Vector3(0, 1, 0));

let soldier = null;
const CROUCHED = 0;
const GETTING_UP = 1;
const RUNNING = 2;
const CROUCHING_DOWN = 3;
new GLTFLoader().load('./models/soldier.glb', (gltf) => {
  const { scene: soldierScene, animations } = gltf;
  const mixer = new AnimationMixer(soldierScene);
  const runClip = AnimationClip.findByName(animations, 'Run');
  const aimClip = AnimationClip.findByName(animations, 'Aim');
  const riseClip = AnimationClip.findByName(animations, 'Rise');
  const runAction = mixer.clipAction(runClip);
  const aimAction = mixer.clipAction(aimClip);
  const riseAction = mixer.clipAction(riseClip);
  runAction.weight = 0;
  aimAction.loop = LoopOnce;
  aimAction.clampWhenFinished = true;
  riseAction.loop = LoopOnce;
  riseAction.clampWhenFinished = true;
  soldier = {
    scene: soldierScene,
    animations,
    mixer,
    runAction,
    aimAction,
    riseAction,
    state: CROUCHED,
  };
  console.log(soldier);
  scene.add(soldier.scene);
});

const keys = {};
const Codes = {
  38: 'UP',
  40: 'DOWN',
  37: 'LEFT',
  39: 'RIGHT',
  87: 'W',
  65: 'A',
  83: 'S',
  68: 'D',
  81: 'Q',
  69: 'E',
  32: 'SPACE',
};
window.addEventListener('keydown', (e) => {
  const keyName = Codes[e.keyCode];
  if (keyName === undefined) {
    return;
  }
  keys[keyName] = true;
});
window.addEventListener('keyup', (e) => {
  const keyName = Codes[e.keyCode];
  if (keyName === undefined) {
    return;
  }
  keys[keyName] = false;
});

const MOVE_SPEED = 0.02;
const TURN_SPEED = 0.005;
const update = (dt) => {
  if (soldier !== null) {
    soldier.runAction.play();
    soldier.aimAction.play();
    camera.position.copy(soldier.scene.position.clone().add(new Vector3(25, 25, 25)));
    camera.lookAt(soldier.scene.position);

    if (keys.UP) {
      if (soldier.state === CROUCHED) {
        soldier.state = GETTING_UP;
        soldier.riseAction.weight = 1;
        soldier.aimAction.weight = 0;
        soldier.runAction.weight = 0;
        soldier.riseAction.reset().play();
      } else if (soldier.state === GETTING_UP) {
        if (soldier.riseAction.paused) {
          soldier.runAction.weight = 1;
          soldier.riseAction.weight = 0;
          soldier.aimAction.weight = 0;
          soldier.state = RUNNING;
        }
      } else if (soldier.state === RUNNING) {
        soldier.scene.position.x += Math.sin(soldier.scene.rotation.y) * MOVE_SPEED * dt;
        soldier.scene.position.z += Math.cos(soldier.scene.rotation.y) * MOVE_SPEED * dt;
        if (keys.LEFT) {
          soldier.scene.rotation.y += TURN_SPEED * dt;
        }
        if (keys.RIGHT) {
          soldier.scene.rotation.y -= TURN_SPEED * dt;
        }
      } else {
        // Soldier is crouching down.
      }
    } else {
      if (soldier.state === RUNNING || soldier.state === GETTING_UP) {
        soldier.state = CROUCHING_DOWN;
        soldier.aimAction.weight = 1;
        soldier.riseAction.weight = 0;
        soldier.runAction.weight = 0;
        soldier.aimAction.reset().play();
      } else if (soldier.state === CROUCHING_DOWN && soldier.aimAction.paused) {
        soldier.state = CROUCHED;
      }
    }

    soldier.mixer.update(dt * 1e-3);
  }
};

let then = Date.now();
const gameLoop = () => {
  requestAnimationFrame(gameLoop);

  const now = Date.now();
  const dt = now - then;
  then = now;

  update(dt);
  renderer.render(scene, camera);
};
gameLoop();
