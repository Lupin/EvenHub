// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "G2Convert",
    platforms: [.macOS(.v14)],
    products: [
        .executable(name: "G2Convert", targets: ["G2Convert"])
    ],
    targets: [
        .executableTarget(
            name: "G2Convert",
            path: "Sources",
            swiftSettings: [.unsafeFlags(["-parse-as-library"])]
        )
    ]
)
