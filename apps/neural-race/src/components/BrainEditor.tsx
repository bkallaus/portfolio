import { type CarSpec, BRAIN_OUTPUT_SIZE, brainInputSize } from '../engine/car';
import { ACTIVATIONS, type Activation, createNetwork, describeShape, parameterCount } from '../engine/network';
import { randomSeed } from '../engine/rng';

type BrainEditorProps = {
  spec: CarSpec;
  canRemove: boolean;
  onChange: (spec: CarSpec) => void;
  onRemove: () => void;
};

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
};

function Slider({ label, value, min, max, step = 1, suffix = '', onChange }: SliderProps) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        <span className="field-value">
          {value}
          {suffix}
        </span>
      </span>
      <input
        className="slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function BrainEditor({ spec, canRemove, onChange, onRemove }: BrainEditorProps) {
  const network = createNetwork(spec.brain, brainInputSize(spec.sensors), BRAIN_OUTPUT_SIZE);
  const layers = spec.brain.hiddenLayers;

  const withBrain = (patch: Partial<CarSpec['brain']>) => onChange({ ...spec, brain: { ...spec.brain, ...patch } });
  const withSensors = (patch: Partial<CarSpec['sensors']>) =>
    onChange({ ...spec, sensors: { ...spec.sensors, ...patch } });
  const withChassis = (patch: Partial<CarSpec['chassis']>) =>
    onChange({ ...spec, chassis: { ...spec.chassis, ...patch } });
  const setLayer = (index: number, size: number) =>
    withBrain({ hiddenLayers: layers.map((current, i) => (i === index ? size : current)) });

  return (
    <div className="editor">
      <div className="editor-header">
        <span className="editor-swatch" style={{ background: spec.color }} />
        <label className="field field-inline">
          <span className="sr-only">Car name</span>
          <input
            className="input input-name"
            value={spec.name}
            onChange={(event) => onChange({ ...spec, name: event.target.value })}
          />
        </label>
        <button type="button" className="button button-quiet" onClick={onRemove} disabled={!canRemove}>
          Remove
        </button>
      </div>

      <p className="editor-summary">
        <span>{describeShape(network)}</span>
        <span>{parameterCount(network)} weights</span>
      </p>

      <section className="editor-section">
        <h3 className="editor-title">Senses</h3>
        <Slider
          label="Sensors"
          value={spec.sensors.count}
          min={1}
          max={13}
          onChange={(count) => withSensors({ count })}
        />
        <Slider
          label="Field of view"
          value={spec.sensors.spreadDegrees}
          min={30}
          max={300}
          step={5}
          suffix="°"
          onChange={(spreadDegrees) => withSensors({ spreadDegrees })}
        />
        <Slider
          label="Range"
          value={spec.sensors.range}
          min={60}
          max={400}
          step={10}
          onChange={(range) => withSensors({ range })}
        />
      </section>

      <section className="editor-section">
        <h3 className="editor-title">Network</h3>
        <div className="layers">
          {layers.length === 0 && <p className="layers-empty">No hidden layers — sensors drive the wheels directly.</p>}
          {layers.map((size, index) => (
            <Slider
              // biome-ignore lint/suspicious/noArrayIndexKey: layers are positional and interchangeable
              key={index}
              label={`Hidden layer ${index + 1}`}
              value={size}
              min={1}
              max={16}
              onChange={(next) => setLayer(index, next)}
            />
          ))}
          <div className="layer-buttons">
            <button
              type="button"
              className="button button-quiet"
              onClick={() => withBrain({ hiddenLayers: [...layers, 6] })}
              disabled={layers.length >= 3}
            >
              Add layer
            </button>
            <button
              type="button"
              className="button button-quiet"
              onClick={() => withBrain({ hiddenLayers: layers.slice(0, -1) })}
              disabled={layers.length === 0}
            >
              Drop layer
            </button>
          </div>
        </div>

        <div className="activations">
          <span className="field-label">Activation</span>
          <div className="segmented">
            {ACTIVATIONS.map((activation: Activation) => (
              <button
                type="button"
                key={activation}
                className={`segment ${spec.brain.activation === activation ? 'is-active' : ''}`}
                onClick={() => withBrain({ activation })}
              >
                {activation}
              </button>
            ))}
          </div>
        </div>

        <Slider
          label="Weight spread"
          value={spec.brain.weightScale}
          min={0.2}
          max={3}
          step={0.1}
          onChange={(weightScale) => withBrain({ weightScale })}
        />

        <div className="seed-row">
          <label className="field field-inline">
            <span className="field-label">Brain seed</span>
            <input
              className="input"
              type="number"
              value={spec.brain.seed}
              onChange={(event) => withBrain({ seed: Number(event.target.value) || 0 })}
            />
          </label>
          <button type="button" className="button button-quiet" onClick={() => withBrain({ seed: randomSeed() })}>
            Shuffle
          </button>
        </div>
      </section>

      <section className="editor-section">
        <h3 className="editor-title">Chassis</h3>
        <Slider
          label="Top speed"
          value={spec.chassis.maxSpeed}
          min={80}
          max={400}
          step={10}
          onChange={(maxSpeed) => withChassis({ maxSpeed })}
        />
        <Slider
          label="Turn rate"
          value={spec.chassis.turnRateDegrees}
          min={60}
          max={300}
          step={5}
          suffix="°/s"
          onChange={(turnRateDegrees) => withChassis({ turnRateDegrees })}
        />
      </section>
    </div>
  );
}
