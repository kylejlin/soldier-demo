import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  MeshStandardMaterial,
  Mesh,
  PlaneGeometry,
  SpotLight,
  Vector3,
  Euler,
  AnimationMixer,
  AnimationClip,
  LoopOnce,
} from 'three';
import GLTFLoader from 'three-gltf-loader';
import GPUParticleSystem from './GPUParticleSystem';

import { Howl } from 'howler';
// http://soundbible.com/1998-Gun-Fire.html
import rifleSrc from './audio/rifle.mp3';

const TAU = 2 * Math.PI;

const rifleSound = new Howl({
  src: rifleSrc,
});

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
const FIRING = 4;
new GLTFLoader().load('./models/soldier.glb', (gltf) => {
  const { scene: soldierScene, animations } = gltf;
  const mixer = new AnimationMixer(soldierScene);
  const runClip = AnimationClip.findByName(animations, 'Run');
  const aimClip = AnimationClip.findByName(animations, 'Aim');
  const riseClip = AnimationClip.findByName(animations, 'Rise');
  const fireClip = AnimationClip.findByName(animations, 'Fire');
  const runAction = mixer.clipAction(runClip);
  const aimAction = mixer.clipAction(aimClip);
  const riseAction = mixer.clipAction(riseClip);
  const fireAction = mixer.clipAction(fireClip);
  runAction.timeScale = 0.85;
  runAction.weight = 0;
  aimAction.loop = LoopOnce;
  aimAction.clampWhenFinished = true;
  riseAction.loop = LoopOnce;
  riseAction.clampWhenFinished = true;
  fireAction.loop = LoopOnce;
  fireAction.clampWhenFinished = true;
  soldier = {
    scene: soldierScene,
    animations,
    mixer,
    runAction,
    aimAction,
    riseAction,
    fireAction,
    state: CROUCHED,
  };
  scene.add(soldier.scene);
});

const particleSystem = new GPUParticleSystem();
particleSystem.timeInSeconds = 0;
scene.add(particleSystem);
const explosions = [];

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
  for (const explosion of explosions.slice()) {
    explosion.emissionDuration -= dt * 1e-3;
    if (explosion.emissionDuration <= 0) {
      explosions.splice(explosions.indexOf(explosion), 1);
      continue;
    }
    for (let i = 0; i < explosion.spawnRate * dt * 1e-3; i++) {
      particleSystem.spawnParticle(explosion);
    }
  }
  particleSystem.timeInSeconds += dt * 1e-3;
  particleSystem.update(particleSystem.timeInSeconds);

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
        soldier.fireAction.weight = 0;
        soldier.riseAction.reset().play();
      } else if (soldier.state === GETTING_UP) {
        if (soldier.riseAction.paused) {
          soldier.runAction.weight = 1;
          soldier.riseAction.weight = 0;
          soldier.aimAction.weight = 0;
          soldier.fireAction.weight = 0;
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
        soldier.fireAction.weight = 0;
        soldier.aimAction.reset().play();
      } else if (soldier.state === CROUCHING_DOWN && soldier.aimAction.paused) {
        soldier.state = CROUCHED;
      } else if (soldier.state === CROUCHED) {
        if (keys.SPACE) {
          soldier.state = FIRING;
          const offset = new Vector3(-0.1, 7, 6.3);
          particleSystem.position.copy(
            soldier.scene.position.clone().add(offset.applyEuler(
              new Euler(0, soldier.scene.rotation.y, 0)
            ))
          );
          particleSystem.rotation.set(
            -0.1,
            0.25 + soldier.scene.rotation.y,
            0
          );
          explosions.push({
            position: new Vector3(0, 0, 0),
          	positionRandomness: .3,
          	velocity: new Vector3(0, 0, 1.45),
          	velocityRandomness: .0,
          	color: 0xaa4400,
          	colorRandomness: .1,
          	turbulence: .0,
          	lifetime: 0.2,
          	size: 5,
          	sizeRandomness: 1,
            spawnRate: 2500,
            emissionDuration: 0.2,
          });
          rifleSound.play();
          soldier.fireAction.weight = 1;
          soldier.runAction.weight = 0;
          soldier.aimAction.weight = 0;
          soldier.riseAction.weight = 0;
          soldier.fireAction.reset().play();
        }
      } else if (soldier.state === FIRING) {
        if (soldier.fireAction.paused) {
          soldier.state = CROUCHED;
        }
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
