{
  "targets": [
    {
      "target_name": "actionify",
      "cflags": [ "-fexceptions" ],
      "cflags_cc": [ "-fexceptions" ],
      "defines": [ "NAPI_CPP_EXCEPTIONS" ],
      "conditions": [
        [
          "OS == 'win'",
          {
            "sources": ["src/addon/actionify/actionify-windows.cc"],
            "include_dirs": [
              "node_modules/node-addon-api",
              "<(module_root_dir)/deps/windows/include"
            ],
            "library_dirs": [
              "<(module_root_dir)/deps/windows/lib"
            ],
            "libraries": [
              # Windows dependencies
              "-lruntimeobject",
              "-ldwmapi",
              "-lgdiplus",
              "-lShcore",
              "-lole32", # used by -larchive
              "-luuid", # used by -larchive
              "-lcomctl32", # used by -larchive
              "-lxmllite", # used by -larchive
              "-lbcrypt", # used by -lcurl
              "-lcrypt32", # used by -lcurl
              "-lsecur32", # used by -lcurl
              "-lws2_32", # used by -lcurl
              "-liphlpapi", # used by -lcurl
              "-lncrypt", # used by -lcurl

              # 3rd party libraries
              "-ltesseract",
              "-larchive",
              "-lbz2",
              "-llz4",
              "-lzstd",
              "-lcurl",
              "-lleptonica",
              "-lpng",
              "-ljpeg",
              "-ltiff",
              "-lwebp",
              "-lgif",
              "-lopenjp2",
              "-llzma",
              "-lsharpyuv",
              "-lminiaudio",
              "-lsherpa-onnx-cxx-api",
              "-lsherpa-onnx-c-api",
              "-lsherpa-onnx-core",
              "-lsherpa-onnx-kaldifst-core",
              "-lkaldi-decoder-core",
              "-lkaldi-native-fbank-core",
              "-lkissfft-float",
              "-lsherpa-onnx-fst",
              "-lsherpa-onnx-fstfar",
              "-lssentencepiece_core",
              "-lonnxruntime",
              "-lespeak-ng",
              "-lpiper_phonemize",
              "-lucd"
            ],
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
        ],
        [
          "OS=='linux'",
          {
            "sources": ["src/addon/actionify/actionify-linux.cc"],
            "include_dirs": [
              "node_modules/node-addon-api",
              "<(module_root_dir)/deps/linux/include"
            ],
            "library_dirs": [
              "<(module_root_dir)/deps/linux/lib"
            ],
            "ldflags": [
              "-Wl,-rpath,'$$ORIGIN'",
            ],
            "libraries": [
              # (dymamic linking: we assume OS provides X11 libraries)
              "-lX11",
              "-lXtst",
              "-lXrandr",
              "-lXi",

              # (static linking: 3rd party libraries)
              "-Wl,-Bstatic",
              "-lxdo",
              "-ltesseract",
              "-larchive",
              "-lbz2",
              "-llz4",
              "-lzstd",
              "-lcurl",
              "-lleptonica",
              "-lpng",
              "-ljpeg",
              "-ltiff",
              "-lwebp",
              "-lgif",
              "-lopenjp2",
              "-llzma",
              "-lsharpyuv",
              "-lfreeimage",
              "-lraw_r",
              "-lopenexr",
              "-lopenexrcore",
              "-lopenexrutil",
              "-lopenjph",
              "-liex",
              "-lilmthread",
              "-limath",
              "-lminiaudio",
              "-lsherpa-onnx-cxx-api",
              "-lsherpa-onnx-c-api",
              "-lsherpa-onnx-core",
              "-lsherpa-onnx-kaldifst-core",
              "-lkaldi-decoder-core",
              "-lkaldi-native-fbank-core",
              "-lkissfft-float",
              "-lsherpa-onnx-fst",
              "-lsherpa-onnx-fstfar",
              "-lssentencepiece_core",
              "-lonnxruntime",
              "-lespeak-ng",
              "-lpiper_phonemize",
              "-lucd",
              "-lfltk",
              "-Wl,-Bdynamic",

              # (dynamic linking: indirect OS dependencies)
              "-lXinerama", # indirect dependency, used by xdo
              "-lxkbcommon", # indirect dependency, used by xdo
              "-lXfixes", # indirect dependency, used by fltk
              "-lXft", # indirect dependency, used by fltk
              "-lgomp", # indirect dependency, used by leptonica and tesseract
              "-lfontconfig", # indirect-ish dependency, used with fltk (FcInit)
            ]
          }
        ]
      ]
    }
  ]
}
