import { Vector, map } from "@/script/utils/math";
import { randomGaussian, randomUniform } from "@/script/utils/math/random";

export const SETTING = {
  TempMax: 1e10,
  TempMin: 0,
  DIAMETER: 500,
  BOLTZMANN: 1,
  MASS: 1,
  DOF: 2,
  UPDATE_RATE: 1,
  RECALL_RATE: 0.01,
};

export class Particle {
  pos: Vector;
  vel: Vector;
  private _accel!: Vector;
  constructor(pos: Vector, vel: Vector) {
    this.pos = pos.copy();
    this.vel = vel.copy();
    this.resetAccel();
  }
  update(deltaTime: number) {
    const dt = deltaTime;
    if (this._accel) this.vel.add(this._accel.copy().mult(dt / SETTING.MASS));
    this.pos.add(this.vel.copy().mult(dt));
  }
  resetAccel() {
    this._accel = Vector.zero(this.pos.dim);
  }
  addAccel(v: Vector) {
    this._accel.add(v);
  }
  get KE() {
    return ParticleSystem.getKE(this.vel.magSq());
  }
  get Temperature() {
    return ParticleSystem.getTemp(this.KE);
  }
}

export class ParticleSystem {
  wall: { left: number; right: number; top: number; bottom: number };
  grid: { left: number; right: number; top: number; bottom: number };
  wall_temp: {
    left: number | null;
    right: number | null;
    top: number | null;
    bottom: number | null;
  };
  particles: Particle[];
  Pressure: number;
  private _dt!: number;
  private _dp!: number;
  constructor(w: number, h: number, n: number, temp: number) {
    this.wall = {
      left: 0,
      right: w,
      top: 0,
      bottom: h,
    };
    this.grid = {
      left: 0,
      right: w,
      top: 0,
      bottom: h,
    };
    this.wall_temp = {
      left: null,
      right: null,
      top: null,
      bottom: null,
    };
    const padding = 0;
    this.particles = new Array(n).fill(null).map(() => {
      return new Particle(
        new Vector(
          map(Math.random(), -padding, 1 + padding, 0, w),
          map(Math.random(), -padding, 1 + padding, 0, h),
        ),
        new Vector(...new Array(SETTING.DOF).fill(0)),
      );
    });
    this.Temperature = temp;
    this.Pressure = 0;
    this.resetStat();
  }
  get w() {
    return this.wall.right - this.wall.left;
  }
  get h() {
    return this.wall.bottom - this.wall.top;
  }
  get KE() {
    return (
      this.particles.reduce((acc, particle) => acc + particle.KE, 0) /
      this.particles.length
    );
  }
  get Temperature() {
    return ParticleSystem.getTemp(this.KE);
  }
  set Temperature(temp) {
    const T0 = this.Temperature;
    if (temp < T0) {
      const factor =
        Math.sqrt((SETTING.BOLTZMANN * temp) / SETTING.MASS) /
        Math.sqrt((SETTING.BOLTZMANN * this.Temperature) / SETTING.MASS);
      this.particles.forEach((particle) => {
        particle.vel.mult(factor);
      });
    } else {
      const factor =
        Math.sqrt((SETTING.BOLTZMANN * temp) / SETTING.MASS) -
        Math.sqrt((SETTING.BOLTZMANN * this.Temperature) / SETTING.MASS);
      this.particles.forEach((particle) => {
        particle.vel.add(
          new Vector(
            ...new Array(SETTING.DOF)
              .fill(null)
              .map(() => randomGaussian(0, 1)),
          ).mult(factor),
        );
      });
    }
  }
  static getKE(velSq: number) {
    return 0.5 * SETTING.MASS * velSq;
  }
  static getTemp(KE: number) {
    return KE / ((2 / SETTING.DOF) * SETTING.BOLTZMANN);
  }
  resetStat(r = SETTING.RECALL_RATE) {
    if (this._dt > 0) {
      const dt_ = r * SETTING.UPDATE_RATE;
      this._dp *= dt_ / this._dt;
      this._dt = dt_;
    } else {
      this._dt = this._dp = 0;
    }
  }
  update(deltaTime: number, n = 1) {
    const gridX = Math.round(
      (this.grid.right - this.grid.left) / SETTING.DIAMETER,
    );
    const gridY = Math.round(
      (this.grid.bottom - this.grid.top) / SETTING.DIAMETER,
    );
    const grid_table: number[][][] = new Array(gridX)
      .fill(null)
      .map(() => new Array(gridY).fill(null).map(() => []));
    const getIndex = (x: number, y: number) => {
      let i, j;
      if (x < this.grid.left) i = 0;
      else if (x > this.grid.right) i = gridX - 1;
      else
        i = Math.floor(map(x, this.grid.left, this.grid.right, 1, gridX - 1));
      if (y < this.grid.top) j = 0;
      else if (y > this.grid.bottom) j = gridY - 1;
      else
        j = Math.floor(map(y, this.grid.top, this.grid.bottom, 1, gridY - 1));
      return [i, j];
    };
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < grid_table.length; j++)
        grid_table[j] = new Array(grid_table[0].length)
          .fill(null)
          .map(() => []);
      for (let i = 0; i < this.particles.length; i++) {
        const particle = this.particles[i];
        this._eval_particle(particle);
        const [x, y] = getIndex(particle.pos.x, particle.pos.y);
        grid_table[x][y].push(i);
      }
      for (let i = 0; i < this.particles.length; i++) {
        const particleA = this.particles[i];
        const ind0 = getIndex(
          particleA.pos.x - SETTING.DIAMETER,
          particleA.pos.y - SETTING.DIAMETER,
        );
        const ind1 = getIndex(
          particleA.pos.x + SETTING.DIAMETER,
          particleA.pos.y + SETTING.DIAMETER,
        );
        for (let x = ind0[0]; x <= ind1[0]; x++) {
          for (let y = ind0[1]; y <= ind1[1]; y++) {
            for (const j of grid_table[x][y]) {
              const particleB = this.particles[j];
              this._eval_pair(particleA, particleB);
            }
          }
        }
      }
      this.particles.forEach((b) => b.update(deltaTime / n));
      this._dt += deltaTime / n;
    }
    const P = this._dp / this._dt / (2 * (this.w + this.h));
    this.Pressure = P;
    if (this._dt > SETTING.UPDATE_RATE) this.resetStat();
  }
  _eval_particle(particle: Particle) {
    if (particle.pos.x - SETTING.DIAMETER < this.wall.left) {
      if (this.wall_temp.left != null) {
        const vel = new Vector(
          ...new Array(SETTING.DOF).fill(null).map(() => randomGaussian(0, 1)),
        ).mult(
          Math.sqrt((SETTING.BOLTZMANN * this.wall_temp.left) / SETTING.MASS),
        );
        const dx = new Vector(-1, randomUniform(-1, +1)).normalize();
        const dv = Vector.sub(vel, particle.vel);
        if (Vector.dot(dx, dv) < 0) {
          const r = Vector.normalize(dx);
          particle.vel.add(r.copy().mult(Vector.dot(dv, r)));
          this._dp -= Vector.dot(dv, r) * SETTING.MASS;
        }
      } else if (particle.vel.x < 0) {
        particle.vel.mult(new Vector(-1, 1));
        this._dp += 2 * Math.abs(particle.vel.x) * SETTING.MASS;
      }
    }
    if (particle.pos.x + SETTING.DIAMETER > this.wall.right) {
      if (this.wall_temp.right != null) {
        const vel = new Vector(
          ...new Array(SETTING.DOF).fill(null).map(() => randomGaussian(0, 1)),
        ).mult(
          Math.sqrt((SETTING.BOLTZMANN * this.wall_temp.right) / SETTING.MASS),
        );
        const dx = new Vector(+1, randomUniform(-1, +1)).normalize();
        const dv = Vector.sub(vel, particle.vel);
        if (Vector.dot(dx, dv) < 0) {
          const r = Vector.normalize(dx);
          particle.vel.add(r.copy().mult(Vector.dot(dv, r)));
          this._dp -= Vector.dot(dv, r) * SETTING.MASS;
        }
      } else if (particle.vel.x > 0) {
        particle.vel.mult(new Vector(-1, 1));
        this._dp += 2 * Math.abs(particle.vel.x) * SETTING.MASS;
      }
    }
    if (particle.pos.y - SETTING.DIAMETER < this.wall.top) {
      if (this.wall_temp.top != null) {
        const vel = new Vector(
          ...new Array(SETTING.DOF).fill(null).map(() => randomGaussian(0, 1)),
        ).mult(
          Math.sqrt((SETTING.BOLTZMANN * this.wall_temp.top) / SETTING.MASS),
        );
        const dx = new Vector(randomUniform(-1, +1), -1).normalize();
        const dv = Vector.sub(vel, particle.vel);
        if (Vector.dot(dx, dv) < 0) {
          const r = Vector.normalize(dx);
          particle.vel.add(r.copy().mult(Vector.dot(dv, r)));
          this._dp -= Vector.dot(dv, r) * SETTING.MASS;
        }
      } else if (particle.vel.y < 0) {
        particle.vel.mult(new Vector(1, -1));
        this._dp += 2 * Math.abs(particle.vel.y) * SETTING.MASS;
      }
    }
    if (particle.pos.y + SETTING.DIAMETER > this.wall.bottom) {
      if (this.wall_temp.bottom != null) {
        const vel = new Vector(
          ...new Array(SETTING.DOF).fill(null).map(() => randomGaussian(0, 1)),
        ).mult(
          Math.sqrt((SETTING.BOLTZMANN * this.wall_temp.bottom) / SETTING.MASS),
        );
        const dx = new Vector(randomUniform(-1, +1), +1).normalize();
        const dv = Vector.sub(vel, particle.vel);
        if (Vector.dot(dx, dv) < 0) {
          const r = Vector.normalize(dx);
          particle.vel.add(r.copy().mult(Vector.dot(dv, r)));
          this._dp -= Vector.dot(dv, r) * SETTING.MASS;
        }
      } else if (particle.vel.y > 0) {
        particle.vel.mult(new Vector(1, -1));
        this._dp += 2 * Math.abs(particle.vel.y) * SETTING.MASS;
      }
    }
  }
  _eval_pair(particleA: Particle, particleB: Particle) {
    const dx = Vector.sub(particleB.pos, particleA.pos);
    const dv = Vector.sub(particleB.vel, particleA.vel);
    if (dx.magSq() == 0) return;
    if (dx.mag() < SETTING.DIAMETER) {
      if (Vector.dot(dx, dv) < 0) {
        const r = Vector.normalize(dx);
        particleA.vel.add(r.copy().mult(Vector.dot(dv, r)));
        particleB.vel.sub(r.copy().mult(Vector.dot(dv, r)));
      }
    }
  }
}