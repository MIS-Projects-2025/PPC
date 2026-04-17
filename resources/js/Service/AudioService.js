import { LOT_UPSTREAM_MODES } from "@/Constants/lotUpstreamModes";

let audioCtx = null;

/**
 * Ensures a single AudioContext exists and is resumed.
 * Browsers often suspend AudioContexts until a user gesture occurs.
 */
const getAudioContext = () => {
	if (!audioCtx) {
		audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	}
	if (audioCtx.state === "suspended") {
		audioCtx.resume();
	}
	return audioCtx;
};

const playTone = (
	ctx,
	frequency,
	startTime,
	duration,
	gainValue = 0.6,
	waveType = "sine",
) => {
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();

	osc.connect(gain);
	gain.connect(ctx.destination);

	osc.type = waveType;
	osc.frequency.setValueAtTime(frequency, startTime);

	gain.gain.setValueAtTime(gainValue, startTime);
	gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

	osc.start(startTime);
	osc.stop(startTime + duration);
};

export const playNotification = (type) => {
	const ctx = getAudioContext();
	const t = ctx.currentTime;

	switch (type) {
		case "success":
			playTone(ctx, 880, t, 0.3, 0.1);
			// Frequency ramp logic can be added here if you want that specific "slide" up
			break;

		case "fail":
		case "wrong":
			playTone(ctx, 110, t, 0.5, 0.1, "square");
			break;

		case LOT_UPSTREAM_MODES.RECEIVE:
			// Two ascending notes — C5 → G5
			playTone(ctx, 523, t, 0.12);
			playTone(ctx, 784, t + 0.14, 0.15);
			break;

		case LOT_UPSTREAM_MODES.RELEASE:
			// Two descending notes — G5 → C5
			playTone(ctx, 784, t, 0.12);
			playTone(ctx, 523, t + 0.14, 0.2);
			break;

		default:
			console.warn(`Unknown notification type: ${type}`);
	}
};
