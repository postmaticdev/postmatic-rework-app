'use client';

import Color from 'color';
import { PipetteIcon } from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

/* -------------------- Helpers: normalisasi HEX -------------------- */

function toWithHashHex6(input?: string): string {
  const raw = (input ?? '').trim().replace(/^#/, '');
  if (raw.length === 0) return '#000000';
  const six =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw.padEnd(6, '0').slice(0, 6);
  return `#${six.toUpperCase()}`;
}

function toNoHashHex6(inputWithOrWithoutHash?: string): string {
  const raw = (inputWithOrWithoutHash ?? '').trim().replace(/^#/, '');
  if (raw.length === 0) return '000000';
  const six =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw.padEnd(6, '0').slice(0, 6);
  return six.toUpperCase();
}

/* -------------------- Context -------------------- */

interface ColorPickerContextValue {
  hue: number; // 0..360
  saturation: number; // 0..100 (HSL)
  lightness: number; // 0..100 (HSL)
  alpha: number; // 0..100 (%)
  mode: 'hex' | 'rgb' | 'css' | 'hsl';
  setHue: (hue: number) => void;
  setSaturation: (saturation: number) => void;
  setLightness: (lightness: number) => void;
  setAlpha: (alpha: number) => void;
  setMode: (mode: 'hex' | 'rgb' | 'css' | 'hsl') => void;
}

const ColorPickerContext = createContext<ColorPickerContextValue | undefined>(
  undefined
);

export const useColorPicker = (): ColorPickerContextValue => {
  const context = useContext(ColorPickerContext);
  if (!context) {
    throw new Error('useColorPicker must be used within a ColorPickerProvider');
  }
  return context;
};

/* -------------------- Root -------------------- */

export type ColorPickerProps = Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  /** nilai dari DB/form, contoh: "FF00FF" (tanpa #) */
  value?: string;
  /** default jika uncontrolled, contoh: "FF00FF" (tanpa #) */
  defaultValue?: string;
  /** callback hasil, harus "FF00FF" (tanpa #) */
  onChange?: (hexNoHash6: string) => void;
  children?: ReactNode;
};

export const ColorPicker = ({
  value,
  defaultValue = '000000',
  onChange,
  className,
  children,
  ...props
}: ColorPickerProps) => {
  // Bangun color awal (#RRGGBB)
  const initialHex = useMemo(
    () => toWithHashHex6(value ?? defaultValue),
    [value, defaultValue]
  );

  // state HSL + alpha
  const [hue, setHue] = useState<number>(0);
  const [saturation, setSaturation] = useState<number>(100);
  const [lightness, setLightness] = useState<number>(50);
  const [alpha, setAlpha] = useState<number>(100);
  const [mode, setMode] = useState<'hex' | 'rgb' | 'css' | 'hsl'>('hex');

  // Inisialisasi dari initialHex
  useEffect(() => {
    const c = Color(initialHex); // #RRGGBB
    const [h, s, l] = c.hsl().array();
    setHue(Math.round(h || 0));
    setSaturation(Math.round(s || 0));
    setLightness(Math.round(l || 0));
    setAlpha(100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run sekali di mount

  // Sinkronkan saat controlled value berubah
  useEffect(() => {
    if (typeof value === 'string') {
      const c = Color(toWithHashHex6(value));
      const [h, s, l] = c.hsl().array();
      setHue(Math.round(h || 0));
      setSaturation(Math.round(s || 0));
      setLightness(Math.round(l || 0));
      // alpha tetap (karena value dari DB tidak memuat alpha)
    }
  }, [value]);

  // Emit ke parent setiap H/S/L/alpha berubah
  useEffect(() => {
    if (!onChange) return;
    const c = Color.hsl(hue, saturation, lightness).alpha(alpha / 100);
    const hexNoHash = toNoHashHex6(c.hex());
    onChange(hexNoHash);
  }, [hue, saturation, lightness, alpha, onChange]);

  return (
    <ColorPickerContext.Provider
      value={{
        hue,
        saturation,
        lightness,
        alpha,
        mode,
        setHue,
        setSaturation,
        setLightness,
        setAlpha,
        setMode,
      }}
    >
      <div className={cn('flex size-full flex-col gap-4', className)} {...props}>
        {children}
      </div>
    </ColorPickerContext.Provider>
  );
};

/* -------------------- Selection (S/L) -------------------- */

export type ColorPickerSelectionProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerSelection = memo(
  ({ className, ...props }: ColorPickerSelectionProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [positionX, setPositionX] = useState(0);
    const [positionY, setPositionY] = useState(0);
    const { hue, setSaturation, setLightness } = useColorPicker();

    const backgroundGradient = useMemo(() => {
      return `linear-gradient(0deg, rgba(0,0,0,1), rgba(0,0,0,0)),
              linear-gradient(90deg, rgba(255,255,255,1), rgba(255,255,255,0)),
              hsl(${hue}, 100%, 50%)`;
    }, [hue]);

    const handlePointerMove = useCallback(
      (event: PointerEvent) => {
        if (!(isDragging && containerRef.current)) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
        setPositionX(x);
        setPositionY(y);
        setSaturation(Math.round(x * 100));

        // peta cahaya: baris atas lebih terang di sisi kiri
        const topLightness = x < 0.01 ? 100 : 50 + 50 * (1 - x);
        const light = topLightness * (1 - y);
        setLightness(Math.round(light));
      },
      [isDragging, setSaturation, setLightness]
    );

    useEffect(() => {
      const handlePointerUp = () => setIsDragging(false);
      if (isDragging) {
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
      }
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }, [isDragging, handlePointerMove]);

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(true);
      handlePointerMove(e.nativeEvent);
    };

    return (
      <div
        className={cn('relative size-full cursor-crosshair rounded', className)}
        onPointerDown={onPointerDown}
        ref={containerRef}
        style={{ background: backgroundGradient }}
        {...props}
      >
        <div
          className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute h-4 w-4 rounded-full border-2 border-white"
          style={{
            left: `${positionX * 100}%`,
            top: `${positionY * 100}%`,
            boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
          }}
        />
      </div>
    );
  }
);

ColorPickerSelection.displayName = 'ColorPickerSelection';

/* -------------------- Hue -------------------- */

export type ColorPickerHueProps = ComponentProps<typeof Slider.Root>;

export const ColorPickerHue = ({ className, ...props }: ColorPickerHueProps) => {
  const { hue, setHue } = useColorPicker();

  const onValueChange = (vals: number[]) => {
    const [h] = vals;
    setHue(Math.max(0, Math.min(360, Math.round(h))));
  };

  return (
    <Slider.Root
      className={cn('relative flex h-4 w-full touch-none', className)}
      max={360}
      step={1}
      value={[hue]}
      onValueChange={onValueChange}
      {...props}
    >
      <Slider.Track className="relative my-0.5 h-3 w-full grow rounded-full bg-[linear-gradient(90deg,#FF0000,#FFFF00,#00FF00,#00FFFF,#0000FF,#FF00FF,#FF0000)]">
        <Slider.Range className="absolute h-full" />
      </Slider.Track>
      <Slider.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
    </Slider.Root>
  );
};

/* -------------------- Alpha -------------------- */

export type ColorPickerAlphaProps = ComponentProps<typeof Slider.Root>;

export const ColorPickerAlpha = ({ className, ...props }: ColorPickerAlphaProps) => {
  const { alpha, setAlpha } = useColorPicker();

  const onValueChange = (vals: number[]) => {
    const [a] = vals;
    setAlpha(Math.max(0, Math.min(100, Math.round(a))));
  };

  return (
    <Slider.Root
      className={cn('relative flex h-4 w-full touch-none', className)}
      max={100}
      step={1}
      value={[alpha]}
      onValueChange={onValueChange}
      {...props}
    >
      <Slider.Track
        className="relative my-0.5 h-3 w-full grow rounded-full"
        style={{
          background:
            'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==") left center',
        }}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent to-black/50" />
        <Slider.Range className="absolute h-full rounded-full bg-transparent" />
      </Slider.Track>
      <Slider.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
    </Slider.Root>
  );
};

/* -------------------- Eyedropper -------------------- */

export type ColorPickerEyeDropperProps = ComponentProps<typeof Button>;

export const ColorPickerEyeDropper = ({ className, ...props }: ColorPickerEyeDropperProps) => {
  const { setHue, setSaturation, setLightness, setAlpha } = useColorPicker();

  const handleEyeDropper = async () => {
    try {
      // @ts-expect-error - EyeDropper API is experimental
      const eyeDropper = new EyeDropper();
      const result: { sRGBHex: string } = await eyeDropper.open();
      const color = Color(result.sRGBHex);
      const [h, s, l] = color.hsl().array();
      setHue(Math.round(h || 0));
      setSaturation(Math.round(s || 0));
      setLightness(Math.round(l || 0));
      setAlpha(100);
    } catch (error) {
      // diam saja jika user cancel
      console.error('EyeDropper failed:', error);
    }
  };

  return (
    <Button
      className={cn('shrink-0 text-muted-foreground', className)}
      onClick={handleEyeDropper}
      size="icon"
      variant="outline"
      type="button"
      {...props}
    >
      <PipetteIcon size={16} />
    </Button>
  );
};

/* -------------------- Output Mode Selector -------------------- */

export type ColorPickerOutputProps = ComponentProps<typeof SelectTrigger>;

const formats: Array<'hex' | 'rgb' | 'css' | 'hsl'> = ['hex', 'rgb', 'css', 'hsl'];

export const ColorPickerOutput = ({ className, ...props }: ColorPickerOutputProps) => {
  const { mode, setMode } = useColorPicker();

  return (
    <Select onValueChange={(v) => setMode(v as 'hex' | 'rgb' | 'css' | 'hsl')} value={mode}>
      <SelectTrigger className="h-8 w-20 shrink-0 text-xs" {...props}>
        <SelectValue placeholder="Mode" />
      </SelectTrigger>
      <SelectContent>
        {formats.map((format) => (
          <SelectItem className="text-xs" key={format} value={format}>
            {format.toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

/* -------------------- Percentage Input (readonly) -------------------- */

type PercentageInputProps = ComponentProps<typeof Input>;

const PercentageInput = ({ className, ...props }: PercentageInputProps) => {
  return (
    <div className="relative">
      <Input
        readOnly
        type="text"
        {...props}
        className={cn(
          'h-8 w-[3.25rem] rounded-l-none bg-secondary px-2 text-xs shadow-none',
          className
        )}
      />
      <span className="-translate-y-1/2 absolute top-1/2 right-2 text-muted-foreground text-xs">
        %
      </span>
    </div>
  );
};

/* -------------------- Format Display -------------------- */

export type ColorPickerFormatProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerFormat = ({ className, ...props }: ColorPickerFormatProps) => {
  const { hue, saturation, lightness, alpha, mode } = useColorPicker();
  const color = Color.hsl(hue, saturation, lightness, alpha / 100);

  if (mode === 'hex') {
    const hexNoHash = toNoHashHex6(color.hex()); // tampilkan TANPA '#'
    return (
      <div
        className={cn(
          '-space-x-px relative flex w-full items-center rounded-md shadow-sm',
          className
        )}
        {...props}
      >
        <Input
          className="h-8 rounded-r-none bg-secondary px-2 text-xs shadow-none"
          readOnly
          type="text"
          value={hexNoHash}
        />
        <PercentageInput value={alpha} />
      </div>
    );
  }

  if (mode === 'rgb') {
    const rgb = color
      .rgb()
      .array()
      .map((v) => Math.round(v));

    return (
      <div
        className={cn('-space-x-px flex items-center rounded-md shadow-sm', className)}
        {...props}
      >
        {rgb.map((v, idx) => (
          <Input
            className={cn(
              'h-8 rounded-r-none bg-secondary px-2 text-xs shadow-none',
              idx && 'rounded-l-none',
              className
            )}
            key={idx}
            readOnly
            type="text"
            value={v}
          />
        ))}
        <PercentageInput value={alpha} />
      </div>
    );
  }

  if (mode === 'css') {
    const rgb = color
      .rgb()
      .array()
      .map((v) => Math.round(v));
    return (
      <div className={cn('w-full rounded-md shadow-sm', className)} {...props}>
        <Input
          className="h-8 w-full bg-secondary px-2 text-xs shadow-none"
          readOnly
          type="text"
          value={`rgba(${rgb.join(', ')}, ${alpha}%)`}
          {...props}
        />
      </div>
    );
  }

  if (mode === 'hsl') {
    const hslVals = color
      .hsl()
      .array()
      .map((v) => Math.round(v));

    return (
      <div
        className={cn('-space-x-px flex items-center rounded-md shadow-sm', className)}
        {...props}
      >
        {hslVals.map((v, idx) => (
          <Input
            className={cn(
              'h-8 rounded-r-none bg-secondary px-2 text-xs shadow-none',
              idx && 'rounded-l-none',
              className
            )}
            key={idx}
            readOnly
            type="text"
            value={v}
          />
        ))}
        <PercentageInput value={alpha} />
      </div>
    );
  }

  return null;
};
