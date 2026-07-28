// swift-tools-version:5.5

import PackageDescription

let package = Package(
    name: "TrustWeb3Provider",
    products: [
        .library(
            name: "TrustWeb3Provider",
            targets: ["TrustWeb3Provider"]
        )
    ],
    dependencies: [],
    targets: [
        .target(
            name: "TrustWeb3Provider",
            dependencies: [],
            path: "packages/ios-web3-provider/swift",
            resources: [
                .process("mixin-min.js", localization: .none)
            ]
        )
    ]
)
