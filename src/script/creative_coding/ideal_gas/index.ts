import { getColor } from "@/script/utils/dom";
import { constrainMap, symlog, symlog_inv } from "@/script/utils/math";
import * as d3 from "d3-color";
import { ParticleSystem, SETTING } from "./particles";
export default function execute() {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let volume_slider: HTMLInputElement;
  let volume_value: HTMLSlotElement;
  let temperature_slider: HTMLInputElement;
  let temperature_value: HTMLSlotElement;
  let pressure_slider: HTMLInputElement;
  let pressure_value: HTMLSlotElement;
  let entropy_slider: HTMLInputElement;
  let entropy_value: HTMLSlotElement;
  let system: ParticleSystem;
  const background = () => getColor("--md-sys-color-surface", "#000");
  const n = 2048;
  const time_scale = 1;
  const max_dt = (1 / 8) * time_scale;
  let isActive = false;
  let pretime = 0;
  const scale = 1e-2;

  function setup() {
    if (!canvas) return;
    ctx.lineWidth = 0;
    ctx.fillStyle = background().formatHex8();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    system.wall.right = canvas.width / scale;
    volume_slider.min = (
      0.5 *
      n *
      Math.PI *
      Math.pow(SETTING.DIAMETER, 2)
    ).toString();
    volume_slider.max = ((canvas.height / scale) * system.w).toString();
    volume_slider.value = system.Volume.toString();
    temperature_slider.min = symlog(SETTING.TempMin).toString();
    temperature_slider.max = symlog(SETTING.TempMax).toString();
    temperature_slider.value = symlog(system.Temperature).toString();
    pressure_slider.min = symlog(
      system.getPressure(Number.parseFloat(volume_slider.max), SETTING.TempMin),
    ).toString();
    pressure_slider.max = symlog(
      system.getPressure(Number.parseFloat(volume_slider.min), SETTING.TempMax),
    ).toString();
    entropy_slider.min = symlog(
      system.getEntropy(Number.parseFloat(volume_slider.min), SETTING.TempMin),
    ).toString();
    entropy_slider.max = symlog(
      system.getEntropy(Number.parseFloat(volume_slider.max), SETTING.TempMax),
    ).toString();
    entropy_slider.value = system.Entropy.toString();
  }

  function draw(time: number) {
    if (!isActive) return;
    if (pretime) {
      const deltaTime = ((time - pretime) * time_scale) / 1000;
      system.update(Math.min(deltaTime, max_dt), 4);
    }
    pretime = time;
    ctx.lineWidth = 0;
    ctx.fillStyle = background().formatHex8();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    system.particles.forEach((particle) => {
      ctx.fillStyle = d3
        .cubehelix(
          constrainMap(
            symlog(particle.Temperature),
            symlog(SETTING.TempMin),
            symlog(SETTING.TempMax),
            180,
            360,
          ),
          1.5,
          Number.parseInt(
            getComputedStyle(document.body).getPropertyValue(
              "--tone-on-surface-variant",
            ),
          ) / 100,
        )
        .formatHex8();
      ctx.beginPath();
      ctx.arc(
        particle.pos.x * scale,
        particle.pos.y * scale,
        (SETTING.DIAMETER / 2) * scale,
        0,
        2 * Math.PI,
      );
      ctx.fill();
    });
    temperature_value.innerText = system.Temperature.toExponential(2);
    pressure_slider.value = symlog(system.Pressure).toString();
    pressure_value.innerText = system.Pressure.toExponential(2);
    entropy_slider.value = symlog(system.Entropy).toString();
    entropy_value.innerText = system.Entropy.toExponential(2);
    requestAnimationFrame(draw);
  }

  function volume_handler() {
    const value = parseFloat(volume_slider.value) / system.w;
    system.wall.bottom = value;
    volume_value.innerText = system.Volume.toExponential(2);
  }
  function temperature_handler() {
    const value = symlog_inv(parseFloat(temperature_slider.value));
    system.wall_temp.bottom = value;
  }
  return {
    start: (sketch: HTMLCanvasElement, config: HTMLFormElement) => {
      canvas = sketch;
      ctx = canvas.getContext("2d", { alpha: false, desynchronized: true })!;
      system = new ParticleSystem(
        canvas.width / scale,
        canvas.height / scale,
        n,
        SETTING.TempMax,
      );
      volume_slider = config.querySelector("#volume")!;
      volume_value = config.querySelector("#volume-value")!;
      temperature_slider = config.querySelector("#temperature")!;
      temperature_value = config.querySelector("#temperature-value")!;
      pressure_slider = config.querySelector("#pressure")!;
      pressure_value = config.querySelector("#pressure-value")!;
      entropy_slider = config.querySelector("#entropy")!;
      entropy_value = config.querySelector("#entropy-value")!;
      volume_slider.addEventListener("input", volume_handler);
      temperature_slider.addEventListener("input", temperature_handler);
      volume_slider.addEventListener("change", () => system.resetStat(0));
      temperature_slider.addEventListener("change", () => system.resetStat(0));
      setup();
      volume_handler();
      temperature_handler();
      isActive = true;
      requestAnimationFrame(draw);
    },
    stop: () => {
      isActive = false;
    },
  };
}
