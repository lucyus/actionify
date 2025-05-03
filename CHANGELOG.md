## [0.10.0](https://github.com/lucyus/actionify/compare/v0.9.2...v0.10.0) (2025-05-03)

### Features

* **@addon:** implement screenshot image scaling ([fd5dd1f](https://github.com/lucyus/actionify/commit/fd5dd1fb6e3100b16f853ea0fd91154d35300710))
* **@core/controllers:** add 'FilesystemController::watch' ([160f996](https://github.com/lucyus/actionify/commit/160f996c9fc8cfabc21cc45cf76aee84007b977f))
* **@core/controllers:** implement 'FilesystemController::appendStream' ([68dfa96](https://github.com/lucyus/actionify/commit/68dfa9654c2182559a21947ccb0980fe844f5af0))
* **@core/controllers:** implement screenshot image scaling ([3c650d1](https://github.com/lucyus/actionify/commit/3c650d11ea509841fc454e677d1e7cf9cabf3b5f))

### Documentation

* **@docs/filesystem:** specify usage of 'FilesystemController::appendStream' ([3fc5a65](https://github.com/lucyus/actionify/commit/3fc5a65e153fe26a7405140da890f3d42292c2ef))
* **@docs/screen:** specify usage of screenshot image scaling ([613cde4](https://github.com/lucyus/actionify/commit/613cde427f1ecc946b91a2f190e0e2a85465a03f))
* **@docs:** specify usage of 'FilesystemController::watch' ([1d6ef2a](https://github.com/lucyus/actionify/commit/1d6ef2af66849f50ac8fd8149c890979e1dfd651))
## [0.9.2](https://github.com/lucyus/actionify/compare/v0.9.1...v0.9.2) (2025-04-12)

### Miscellaneous Chores

* **@config:** ensure version tags are pushed when running 'npm run release:*' ([3ba3c2e](https://github.com/lucyus/actionify/commit/3ba3c2ed18332817f38add95ad306bacdb819032))
## [0.9.1](https://github.com/lucyus/actionify/compare/v0.9.0...v0.9.1) (2025-04-12)

### Documentation

* **@changelog:** adjust release dates ([2d41008](https://github.com/lucyus/actionify/commit/2d41008d15c5bef0ecd2fba7a907bc8d0b354d97))

### Miscellaneous Chores

* **@config:** append latest version only to 'CHANGELOG.md' when using 'npm run changelog' ([3d962bf](https://github.com/lucyus/actionify/commit/3d962bf16ce55abea0b902400962a341b5ab5cd5))
* **@config:** specify explicitly git origin and branch in 'npm run release:*' commands ([105d9a7](https://github.com/lucyus/actionify/commit/105d9a7b4b26084423defde1825c385e871935de))
## [0.9.0](https://github.com/lucyus/actionify/compare/v0.8.2...v0.9.0) (2025-04-12)

### Bug Fixes

* **@addon:** ensure correct conversion of tray icon tooltip text on update ([f29dea9](https://github.com/lucyus/actionify/commit/f29dea9b05dfd86a2673b30281a36475feae75be))
* **@core:** prevent tray icon tooltip text from exceeding 127 characters ([f4bf8ad](https://github.com/lucyus/actionify/commit/f4bf8ad37d1ad94d55701acd45ec657e272d9c0b))

### Documentation

* **@docs:** update tray icon's icon and tooltip usage ([fad9f47](https://github.com/lucyus/actionify/commit/fad9f471549f7b194372356e24ced9658edda1c1))

### Miscellaneous Chores

* **@config:** enable automatic changelog generation ([69ad749](https://github.com/lucyus/actionify/commit/69ad7491fb8355ef3a7ae116869d1e5b605bc5fd))
* **@config:** enable automatic release commit and version tag generation ([1d14021](https://github.com/lucyus/actionify/commit/1d14021582a32a00be0ee0042e60d75370d6d4e8))

### Code Refactoring

* **@core:** simplify tray icon usage by flattening icon and tooltip handling ([4594c8e](https://github.com/lucyus/actionify/commit/4594c8ec3503428eccc553185c95727ea57dc6a3))
## [0.8.2](https://github.com/lucyus/actionify/compare/v0.8.1...v0.8.2) (2025-04-07)

### Bug Fixes

* **@core/services:** specify return type of 'InputEventService.mainListener' to resolve TypeScript type inference issue ([c3d7104](https://github.com/lucyus/actionify/commit/c3d7104fa79ff670401517eeb73700370322cc03))
## [0.8.1](https://github.com/lucyus/actionify/compare/v0.8.0...v0.8.1) (2025-04-07)

### Code Refactoring

* **@docs:** update Actionify example imports to match TypeScript export syntax ([a4491eb](https://github.com/lucyus/actionify/commit/a4491ebe1e6490fc96d747ef599cd2d380ba6937))
## [0.8.0](https://github.com/lucyus/actionify/compare/v0.7.0...v0.8.0) (2025-04-07)

### Code Refactoring

* **@addon:** relocate NAPI C++ files for better structure ([2224446](https://github.com/lucyus/actionify/commit/222444603852ad72291a568aea36bb2dd0439354))
* **@config:** relocate NAPI C++ files for better structure ([03ab817](https://github.com/lucyus/actionify/commit/03ab817ed128786d9212a1a6903767c56e2a5712))
* **@docs:** update broken links to reflect new TypeScript codebase folder structure ([1a1e05c](https://github.com/lucyus/actionify/commit/1a1e05cea13d4a24926c5167400a9102ad652e2b))
* **global:** restructure TypeScript codebase for better maintainability ([785703e](https://github.com/lucyus/actionify/commit/785703e479b9a554894218e6a73abb739fd562b9))
## [0.7.0](https://github.com/lucyus/actionify/compare/v0.6.0...v0.7.0) (2025-03-29)

### Features

* **@addon:** add monitor scale data to 'screen.list()' ([5edcaa9](https://github.com/lucyus/actionify/commit/5edcaa98fe5baeafc5588125197187e8d0442422))
* **@core:** add monitor scale data to 'screen.list()' ([f2a07a2](https://github.com/lucyus/actionify/commit/f2a07a215e7db17213f036d1b43a3d9a01fa4ea9))

### Bug Fixes

* **@addon:** update coordinate system to support DPI scaling ([78e9b01](https://github.com/lucyus/actionify/commit/78e9b01d42e13694d2c8fdc9a81b2cdeb823fa29))
* **@core:** update dynamically window data in 'window.list()' and 'window.get()' ([4e37ca4](https://github.com/lucyus/actionify/commit/4e37ca40614cff7e7e859cd999a0a19f64ca07d7))

### Code Refactoring

* **@core:** support multiple import methods ([e7b24d5](https://github.com/lucyus/actionify/commit/e7b24d5147cd87056681715b5cc477d95dbf1749))
## [0.6.0](https://github.com/lucyus/actionify/compare/v0.5.0...v0.6.0) (2025-03-07)

### Features

* **@addon:** implement System Tray Icon Manager ([b7733ce](https://github.com/lucyus/actionify/commit/b7733ce2ae23237aa0bda917a7d5a09dddb3ea78))
* **@assets:** add icons presets ([648cb4c](https://github.com/lucyus/actionify/commit/648cb4c43d2528eee9f8b9cf1fc8ecec9c728bd3))
* **@core:** implement System Tray Icon Manager ([8517edd](https://github.com/lucyus/actionify/commit/8517edde09962cb47a6c19fb2df6191cfb97adfd))
* **@docs:** add 'System Tray Manager' documentation ([511a2eb](https://github.com/lucyus/actionify/commit/511a2eba57c9002e21dc392e96e89fd3c171be5b))

### Miscellaneous Chores

* **global:** copy assets files in Typescript build directory ([5eaa592](https://github.com/lucyus/actionify/commit/5eaa5925b2936930826dc90d6e687f5050d25d39))
## [0.5.0](https://github.com/lucyus/actionify/compare/v0.4.0...v0.5.0) (2025-03-05)

### Features

* **@addon:** implement Sound Manager's audio playback ([89621e9](https://github.com/lucyus/actionify/commit/89621e9f95763a1b7ab8cfa117062df47edd1d99))
* **@core:** implement Sound Manager's audio playback ([ee6e6f7](https://github.com/lucyus/actionify/commit/ee6e6f7871379130bd5c6c3a6054d1501bb9e569))
* **@docs:** add 'Sound Manager' documentation ([5aa322a](https://github.com/lucyus/actionify/commit/5aa322acdeb7baa616ebc7e45f7d73a6751583dc))

### Code Refactoring

* **@core:** forward 'time.waitAsync()' callback return value ([56e0e54](https://github.com/lucyus/actionify/commit/56e0e54456b630e567464f27b0df8868210849e8))
* **@core:** remove leftover 'console.log()' ([dbeb6f8](https://github.com/lucyus/actionify/commit/dbeb6f8a936418198190d561d0dd9e7ca2e1046f))
* **@docs:** improve project description and 'README.md' introduction ([a112954](https://github.com/lucyus/actionify/commit/a112954209f5bfdb2c292811cc2b1f7b8d0f2d78))
## [0.4.0](https://github.com/lucyus/actionify/compare/v0.3.1...v0.4.0) (2025-02-11)

### Features

* **@addon:** add 'Color::alpha' ([9dc35b3](https://github.com/lucyus/actionify/commit/9dc35b38aa04781f2c2f54b871a2f78fe1d24450))
* **@addon:** implement Image Template Matching ([c80bf25](https://github.com/lucyus/actionify/commit/c80bf25ba2fd7f423722bef3c3c122af30ae42ea))
* **@core:** add 'Color::alpha' ([afaeeb5](https://github.com/lucyus/actionify/commit/afaeeb5cbe9c2911cbbec574970652c53ecf8e78))
* **@core:** implement Image Template Matching through 'ai.image().find()' ([f08d453](https://github.com/lucyus/actionify/commit/f08d4538dae8c48e8c09fcd1a679737b9e083f2d))
* **@docs:** specify usage of Image Template Matching through 'ai.image().find()' ([ab99b58](https://github.com/lucyus/actionify/commit/ab99b58c37383b44b3850c9b112c05f58a363202))
## [0.3.1](https://github.com/lucyus/actionify/compare/v0.3.0...v0.3.1) (2025-02-09)

### Bug Fixes

* **@core:** select and run recorders after listeners to prevent writing to closed write streams ([bb23a89](https://github.com/lucyus/actionify/commit/bb23a89d310bb54d0bc689b4536e75d427c9f3e9))

### Documentation

* **@config:** update 'package.json' description to match 'README.md' ([e1ef89a](https://github.com/lucyus/actionify/commit/e1ef89a1864de775c7befc408683bf80e0cf920c))
## [0.3.0](https://github.com/lucyus/actionify/compare/v0.2.0...v0.3.0) (2025-02-07)

### Features

* **@core:** implement optional delay and motion settings for 'window.move()' ([d6ec57d](https://github.com/lucyus/actionify/commit/d6ec57d2a55fceff3ce3b00415ece9d5d1d0f382))
* **@core:** implement optional delay and motion settings for 'window.resize()' ([40f1e21](https://github.com/lucyus/actionify/commit/40f1e214d346b307d47afe63f950565de665c202))
* **@core:** implement optional linear motion for 'mouse.scroll.down()' and 'mouse.scroll.up()' ([3fb7472](https://github.com/lucyus/actionify/commit/3fb7472314bc284991c38ac15cbecfc544894e23))
* **@core:** support custom predicates for 'Actionify.loop()' ([f182d99](https://github.com/lucyus/actionify/commit/f182d9919308af78690a61b6946bc46ed8afc8fe))
* **@docs:** specify 'window.move()' now triggers 'window.restore()' if the window is maximized just before moving ([e06d611](https://github.com/lucyus/actionify/commit/e06d611af5cb3298be6f53a04f0b2315b55ed69c))
* **@docs:** specify that motion steps can also be limited by delay ([5f7b202](https://github.com/lucyus/actionify/commit/5f7b20239a19f51cd960b2e428af95b18e46aa0e))
* **@docs:** specify usage of 'mouse.scroll.down()' and 'mouse.scroll.up()' optional linear motion setting ([99283a8](https://github.com/lucyus/actionify/commit/99283a8e7e2dc76345f90d7401ad1517328f41b2))
* **@docs:** specify usage of 'window.move()' optional delay and motion settings ([adb71a5](https://github.com/lucyus/actionify/commit/adb71a57619375fe8b0df0d38b5ce1cd88c74ff3))
* **@docs:** specify usage of 'window.resize()' optional delay and motion settings ([fc1bf97](https://github.com/lucyus/actionify/commit/fc1bf9760e80ee98f89d64acf9e2f74040b88076))
* **@docs:** specify usage of custom predicates for 'Actionify.loop()' ([3234712](https://github.com/lucyus/actionify/commit/32347129e6c833ad10feafc067e7f74c9d27c4ff))

### Bug Fixes

* **@addon:** compute correctly new windows positions and dimensions ([6bbf3bd](https://github.com/lucyus/actionify/commit/6bbf3bd3f85abec11c3f25c25e47aaafa84f1dd6))
* **@addon:** ignore window left border for 'window.move(x, y)' ([1a8c454](https://github.com/lucyus/actionify/commit/1a8c4544cbaceefacb6f1d6c72cd00bfdf06e543))
* **@core:** limit motion steps by delay to prevent time overshooting on large distances ([7b13134](https://github.com/lucyus/actionify/commit/7b13134976bd2800727942738b7eed9f25aec9d0))
* **@core:** refetch window coordinates in case of 'window.restore()' before 'window.move()' to ensure correct motion ([0a2ebb7](https://github.com/lucyus/actionify/commit/0a2ebb78e05f50968830172a06f472631bf2021f))
* **@core:** restore also a maximized window before 'window.move()' ([bac9c66](https://github.com/lucyus/actionify/commit/bac9c66ed17174adc3ddf6293f8ed39e3c6ce144))
* **@core:** restore also a maximized window before 'window.resize()' ([9db22b8](https://github.com/lucyus/actionify/commit/9db22b8c42e29e68f0a16a65513b499f801fcb40))
* **@docs:** correct mismatched descriptive comment ([e9f09c7](https://github.com/lucyus/actionify/commit/e9f09c7c4ef719096d47121ef28c7234751fb5fe))

### Code Refactoring

* **@core:** replace unnecessary 'let' with 'const' ([c10f850](https://github.com/lucyus/actionify/commit/c10f850d39494cdf6c9687936befb3791c2099ee))
## [0.2.0](https://github.com/lucyus/actionify/compare/v0.1.1...v0.2.0) (2025-02-03)

### Features

* **@addon:** add 'Event::isSuppressed' ([7538d72](https://github.com/lucyus/actionify/commit/7538d72816dae26e4fb459e803ce55e9fc3097b1))
* **@core:** add 'Event::isSuppressed' ([df90f26](https://github.com/lucyus/actionify/commit/df90f2627ebe88a8ad05f7e2656e7c6103a0a5aa))
* **@core:** implement optional delay for simulated inputs ([db4b1b9](https://github.com/lucyus/actionify/commit/db4b1b91d4784e4469471925b94b217a5b021df2))
* **@core:** implement optional speed control for input replays ([fa2fa2a](https://github.com/lucyus/actionify/commit/fa2fa2a15a2de97b25cd93c2ee72db4b229fb535))
* **@docs:** specify new uses of 'ListenerController' ([6144be4](https://github.com/lucyus/actionify/commit/6144be47ceed91ead7faf2b1cdb70a861d077a8b))
* **@docs:** specify usage of optional delay for simulated inputs ([deb0e31](https://github.com/lucyus/actionify/commit/deb0e31ddc29cc4f9d8c25ff5517f92ff43122b0))
* **@docs:** specify usage of optional speed control for input replays ([d7904d4](https://github.com/lucyus/actionify/commit/d7904d4558916ed18fb978f92390af5394885889))

### Bug Fixes

* **@addon:** ensure 'StartEventListener' waits for hooks to be set before proceeding ([49f0257](https://github.com/lucyus/actionify/commit/49f025710824368ac7b102c708befb0cf02dd14e))
* **@core:** prevent mouse motion when delay is zero ([42f238f](https://github.com/lucyus/actionify/commit/42f238fd5f4fb5393b32f0ffe3d7659b0c11d82e))

### Code Refactoring

* **@core:** implement 'ListenerController' and passes it to input listeners ([9c6f5ac](https://github.com/lucyus/actionify/commit/9c6f5acede4886e4ba25e7dc4b58b8e906694694))
## [0.1.1](https://github.com/lucyus/actionify/compare/v0.1.0...v0.1.1) (2025-02-01)

### Features

* **@core:** implement Lifecycle 'restart' and 'exit' functions ([58d2d3c](https://github.com/lucyus/actionify/commit/58d2d3c2acacabbd3a88ebe93ed73acc8ff9b1d8))
* **@core:** implement non-blocking loop utility function ([df43bc2](https://github.com/lucyus/actionify/commit/df43bc222d26421ef3740facf6f9da5e19842d85))
* **@docs:** add 'Lifecycle' documentation ([2db2cdd](https://github.com/lucyus/actionify/commit/2db2cdd01aab53b9d199071de7f754345f709a83))

### Bug Fixes

* **@config:** rename 'publish' script to 'deploy' to prevent conflicts with npm hooks ([b71699f](https://github.com/lucyus/actionify/commit/b71699fda6b9d81f11aab39625696dc02d06b153))
## [0.1.0](https://github.com/lucyus/actionify/compare/bffd4bb45da9c1424f06b69060caab93a2053bc2...v0.1.0) (2025-01-26)

### Features

* **global:** initialize project ([bffd4bb](https://github.com/lucyus/actionify/commit/bffd4bb45da9c1424f06b69060caab93a2053bc2))
