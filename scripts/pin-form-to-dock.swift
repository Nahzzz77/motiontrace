import Foundation
import CoreFoundation

let dockDomain = "com.apple.dock" as CFString
let persistentAppsKey = "persistent-apps" as CFString
let appPath = "/Applications/MotionTrace.app"
let bundleIdentifier = "io.github.nahzzz77.motiontrace.launcher"
let appURL = URL(fileURLWithPath: appPath, isDirectory: true)

guard FileManager.default.fileExists(atPath: appPath) else {
  fputs("找不到 \(appPath)\n", stderr)
  exit(1)
}

let bookmark = try appURL.bookmarkData(
  options: [.minimalBookmark],
  includingResourceValuesForKeys: nil,
  relativeTo: nil
)

var apps = CFPreferencesCopyAppValue(persistentAppsKey, dockDomain) as? [[String: Any]] ?? []
apps.removeAll { item in
  guard let tileData = item["tile-data"] as? [String: Any] else { return false }
  if tileData["bundle-identifier"] as? String == bundleIdentifier { return true }
  guard let fileData = tileData["file-data"] as? [String: Any] else { return false }
  return fileData["_CFURLString"] as? String == appURL.absoluteString
}

let tile: [String: Any] = [
  "GUID": UInt32.random(in: 1...UInt32.max),
  "tile-data": [
    "book": bookmark,
    "bundle-identifier": bundleIdentifier,
    "dock-extra": 0,
    "file-data": [
      "_CFURLString": appURL.absoluteString,
      "_CFURLStringType": 15,
    ],
    "file-label": "动迹 MotionTrace",
    "file-type": 41,
  ],
  "tile-type": "file-tile",
]

apps.append(tile)
CFPreferencesSetAppValue(persistentAppsKey, apps as CFArray, dockDomain)
guard CFPreferencesAppSynchronize(dockDomain) else {
  fputs("无法保存程序坞设置\n", stderr)
  exit(1)
}

print("已写入程序坞应用书签")
