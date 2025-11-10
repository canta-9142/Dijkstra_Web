export {};

declare global {
    interface Window {
        P5_INSTANCE?: import("p5").default;
        P5_CONFIG?: {
            width: number;
            height: number;
            useAStar: boolean;
        };
    }
}