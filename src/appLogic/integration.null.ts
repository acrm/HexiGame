interface PlatformIntegration {
  init(): Promise<void> | void;
  onGameReady(): void;
  onGameplayStart(): void;
  onGameplayStop(): void;
  onPause(): void;
  onResume(): void;
}

class NullIntegration implements PlatformIntegration {
  init() {}
  onGameReady() {}
  onGameplayStart() {}
  onGameplayStop() {}
  onPause() {}
  onResume() {}
}

export const integration: PlatformIntegration = new NullIntegration();

if (typeof window !== 'undefined') {
  integration.init();
}
