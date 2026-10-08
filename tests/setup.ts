import '@testing-library/jest-dom/vitest';

// Happy DOM does not implement the browser animation timeline. Its WAAPI
// cancellation rejects promises unlike the real timeline Framer Motion uses.
// Exercise Framer's JavaScript animation path in component tests; actual reel
// transitions and reduced-motion behaviour are also verified in browser QA.
Reflect.deleteProperty(Element.prototype, 'animate');
