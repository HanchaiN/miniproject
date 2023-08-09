import Header from "@/components/header";
import React, { Suspense, useEffect, useRef } from "react";

const Preview = React.lazy(async () => {
  const main =
    typeof window !== "undefined"
      ? (await import("@/script/creative_coding/hydrogen_pilot")).default
      : () => null;
  return {
    default: function Component() {
      const canvas = useRef<HTMLDivElement>(null);
      const exec = main();
      useEffect(() => {
        exec?.start(canvas.current!);
      }, []);
      useEffect(
        () => () => {
          exec?.stop();
        },
        [],
      );
      return <div ref={canvas}></div>;
    },
  };
});

export default function Body() {
  return (
    <>
      <article>
        <h1>Hydrogen Pilot Wave</h1>
        <Suspense>
          <Preview />
        </Suspense>
        <p>
          The de Broglie&ndash;Bohm theory, also known as the pilot wave theory,
          Bohmian mechanics, Bohm&apos;s interpretation, and the causal
          interpretation, is an interpretation of quantum mechanics. In addition
          to the wavefunction, it also postulates an actual configuration of
          particles exists even when unobserved. The evolution over time of the
          configuration of all particles is defined by a guiding equation. The
          evolution of the wave function over time is given by the Schrödinger
          equation.
        </p>
      </article>
    </>
  );
}

export function Head() {
  return (
    <>
      <Header title="DTMF" />
    </>
  );
}