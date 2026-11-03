# AI Design Check

Find and fix what makes an interface built with an AI agent look generated, on the web and in SwiftUI, Jetpack Compose, Flutter
and React Native apps.

Two skills, both used through your coding agent:

- **ai-design-check** has the agent read the design rules before touching a screen and run the checker afterwards.
- **ai-design-fix** repairs a screen that already looks generated. It measures the screen, writes a short brief from your
  product, works through it in order of harm, and reports the count before and after. Features, data and words stay.

Install in Claude Code:

```
/plugin install ai-design-check --marketplace enmerasoftware/ai-design-check
```

Then ask: *"fix the design of this screen"*.

The skills call the [`@enmera/ai-design-check`](https://www.npmjs.com/package/@enmera/ai-design-check) checker through `npx`. It
runs on your machine, needs no account, model or API key, and sends nothing anywhere. Code, rules and docs:
https://github.com/enmerasoftware/ai-design-check
