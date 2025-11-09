//
//  AdMobInitializer.swift
//  candyWarz
//
//  Created by Claude Code
//  Copyright © 2025. All rights reserved.
//

import Foundation
import GoogleMobileAds
import React

@objc(AdMobInitializer)
class AdMobInitializer: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  func initialize(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Run initialization on background thread to avoid blocking UI
    DispatchQueue.global(qos: .background).async {
      MobileAds.shared.start { initializationStatus in
        // Once initialized, resolve promise on main thread
        DispatchQueue.main.async {
          resolve([
            "initialized": true,
            "adapters": AdMobInitializer.getAdapterStatus(initializationStatus)
          ])
        }
      }
    }
  }

  // Helper method to get adapter initialization status
  private static func getAdapterStatus(_ status: InitializationStatus) -> [[String: Any]] {
    var adapters: [[String: Any]] = []

    for (adapterName, adapterStatus) in status.adapterStatusesByClassName {
      adapters.append([
        "name": adapterName,
        "state": adapterStatus.state.rawValue,
        "description": adapterStatus.description
      ])
    }

    return adapters
  }
}
