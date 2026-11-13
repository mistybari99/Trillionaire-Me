// Screens that are lazy chunks in the real app are loaded once here, so every test can still render them synchronously.
import "fake-indexeddb/auto";
import { preloadLazy } from "../src/ui/lazy";
import "../src/ui/lazyScreens";

await preloadLazy();
