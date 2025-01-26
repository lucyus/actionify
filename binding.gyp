{
  "targets": [
    {
      "target_name": "actionify",
      "sources": ["src/actionify.cc"],
      "include_dirs": [
        "node_modules/node-addon-api"
      ],
      "cflags": [ "-fexceptions" ],
      "cflags_cc": [ "-fexceptions" ],
      "defines": [ "NAPI_CPP_EXCEPTIONS" ],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": "2"
        },
        "VCLinkerTool": {
          # Disable debug information (.pdb file)
          "GenerateDebugInformation": "false"
        }
      }
    }
  ]
}
