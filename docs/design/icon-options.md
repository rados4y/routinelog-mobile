# RoutineLog icon options

![Four app icon concepts](icon-options.png)

| Option          | Concept                                                 |
| --------------- | ------------------------------------------------------- |
| A · Check loop  | White check and circular loop on raspberry pink.        |
| B · Daily log   | Journal/checklist on charcoal, with a pink page corner. |
| C · Small steps | Green/pink progress blocks on charcoal.                 |
| D · RL monogram | Geometric white monogram and pink dot.                  |

**Selected: C · Small steps.** Applied in Android 1.3.0 (versionCode 4).

The launcher uses [the full icon](../../assets/branding/icon.png) and a separately
[padded adaptive foreground](../../assets/branding/adaptive-icon.png), with a charcoal background.
The extra padding keeps the symbol inside Android launcher masks.
Installing the new APK applies the launcher icon; widget JS changes remain OTA-compatible
within the corresponding runtime.

Configuration checked against the [Expo SDK 57 app icon reference](https://docs.expo.dev/versions/v57.0.0/config/app/#adaptiveicon)
and [runtime version guidance](https://docs.expo.dev/eas-update/runtime-versions/).
