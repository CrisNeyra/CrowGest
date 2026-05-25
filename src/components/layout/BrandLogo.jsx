/** Logo de marca — borde con border (no ring) para evitar recorte por overflow del padre. */

const LOGO_SRC = '/logo.jpg';

const sizeConfig = {
  xs: {
    box: 'h-10 w-10',
    img: 'scale-[1.1]',
  },
  sm: {
    box: 'h-[3.25rem] w-[3.25rem]',
    img: 'scale-[1.08]',
  },
  lg: {
    box: 'h-32 w-32',
    img: 'scale-[1.06]',
  },
};

export default function BrandLogo({ size = 'sm', className = '' }) {
  const cfg = sizeConfig[size];

  return (
    <div
      className={`box-border flex shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-blue-500 bg-slate-950 ${cfg.box} ${className}`}
    >
      <img
        src={LOGO_SRC}
        alt="Gest Crow"
        className={`h-full w-full object-cover object-center ${cfg.img}`}
        draggable={false}
      />
    </div>
  );
}
