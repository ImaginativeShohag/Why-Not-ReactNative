// Text-to-speech with AVSpeechSynthesizer, which can use the Siri and
// Premium/Enhanced voices that `say` can't. voice.mjs runs it with the `swift`
// interpreter: a compiled binary isn't shown the Siri voices, and
// AVSpeechSynthesisVoice(identifier:) then silently falls back to a default voice.
//
//   swift speak.swift --list
//   swift speak.swift <voice-identifier> <rate 0…1> <out.wav> <text> [<out.wav> <text> …]
import AVFoundation

func fail(_ message: String) -> Never {
  FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
  exit(1)
}

let args = CommandLine.arguments
let voices = AVSpeechSynthesisVoice.speechVoices()

if args.count == 2 && args[1] == "--list" {
  for voice in voices where voice.language.hasPrefix("en") {
    let quality: String
    switch voice.quality {
    case .premium: quality = "premium"
    case .enhanced: quality = "enhanced"
    default: quality = "default"
    }
    print("\(quality)\t\(voice.language)\t\(voice.identifier)\t\(voice.name)")
  }
  exit(0)
}

guard args.count >= 5, (args.count - 3) % 2 == 0 else {
  fail("usage: speak <voice-identifier> <rate> <out.wav> <text> [<out.wav> <text> …]")
}
guard let voice = voices.first(where: { $0.identifier == args[1] }) else {
  fail("Voice \(args[1]) isn't available to this process")
}
let rate = Float(args[2]) ?? AVSpeechUtteranceDefaultSpeechRate
let synth = AVSpeechSynthesizer()

func speak(_ text: String, to path: String) {
  let utterance = AVSpeechUtterance(string: text)
  utterance.voice = voice
  utterance.rate = rate
  var file: AVAudioFile?
  var done = false
  synth.write(utterance) { buffer in
    guard let pcm = buffer as? AVAudioPCMBuffer else { return }
    if pcm.frameLength == 0 {
      done = true
      return
    }
    do {
      if file == nil {
        file = try AVAudioFile(
          forWriting: URL(fileURLWithPath: path), settings: pcm.format.settings,
          commonFormat: pcm.format.commonFormat, interleaved: pcm.format.isInterleaved)
      }
      try file?.write(from: pcm)
    } catch {
      fail("\(error)")
    }
  }
  let deadline = Date().addingTimeInterval(60)
  while !done && Date() < deadline {
    RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.05))
  }
  if file == nil { fail("No audio produced for \(path)") }
}

for i in stride(from: 3, to: args.count, by: 2) {
  speak(args[i + 1], to: args[i])
}
