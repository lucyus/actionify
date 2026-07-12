import { ActionifyCliController } from "./controllers";

new ActionifyCliController()
    .run()
    .then(exitCode => process.exit(exitCode));
