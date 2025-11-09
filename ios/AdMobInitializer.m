//
//  AdMobInitializer.m
//  candyWarz
//
//  Created by Claude Code
//  Copyright © 2025. All rights reserved.
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AdMobInitializer, NSObject)

RCT_EXTERN_METHOD(initialize:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
