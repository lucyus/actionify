export type WindowEventType =
      "create"   // OS-generated
    | "destroy"  // OS-generated
    | "focus"    // OS-generated
    | "blur"     // Actionify-generated
    | "minimize" // Actionify-generated
    | "maximize" // Actionify-generated
    | "restore"  // Actionify-generated
    | "move"     // Actionify-generated
    | "resize"   // Actionify-generated
;
