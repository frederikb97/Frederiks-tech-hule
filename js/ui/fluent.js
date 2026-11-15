// Fluent UI Web Components (v2), lagt i vendor/ så appen stadig kører uden build og uden CDN.
import {
  provideFluentDesignSystem, fluentAccordion, fluentAccordionItem, fluentAnchor, fluentBadge, fluentButton,
  fluentCheckbox, fluentOption, fluentProgress, fluentRadio, fluentRadioGroup, fluentSelect, fluentTextField,
  baseLayerLuminance, StandardLuminance, controlCornerRadius, layerCornerRadius,
} from '../../vendor/fluent/web-components.min.js';

provideFluentDesignSystem().register(
  fluentAccordion(), fluentAccordionItem(), fluentAnchor(), fluentBadge(), fluentButton(), fluentCheckbox(),
  fluentOption(), fluentProgress(), fluentRadio(), fluentRadioGroup(), fluentSelect(), fluentTextField(),
);

controlCornerRadius.withDefault(8);
layerCornerRadius.withDefault(12);

// Følg enhedens lyse/mørke tema.
const dark = matchMedia('(prefers-color-scheme: dark)');
const applyTheme = () => baseLayerLuminance.withDefault(dark.matches ? StandardLuminance.DarkMode : StandardLuminance.LightMode);
applyTheme();
dark.addEventListener('change', applyTheme);
