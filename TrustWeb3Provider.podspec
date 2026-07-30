Pod::Spec.new do |s|
  s.name             = 'TrustWeb3Provider'
  s.version          = '4.0.0'
  s.summary          = 'Web3 JavaScript provider for iOS and Android platforms.'
  s.description      = 'Mixin Messenger Web3 provider for embedded dApp browsers.'
  s.homepage         = 'https://github.com/MixinNetwork/trust-web3-provider'
  s.license          = { :type => 'MIT' }
  s.author           = { 'Mixin Network' => 'support@mixin.one' }
  s.source           = {
    :git => 'https://github.com/MixinNetwork/trust-web3-provider.git',
    :tag => s.version.to_s
  }

  s.ios.deployment_target = '13.0'
  s.source_files = 'packages/ios-web3-provider/swift/*.swift'
  s.resource_bundles = {
    'TrustWeb3Provider' => ['packages/ios-web3-provider/swift/mixin-min.js']
  }
end
