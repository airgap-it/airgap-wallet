//
//  AppInfo.m
//  App
//
//  Created by Julia Samol on 24.04.20.
//

#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(AppInfo, "AppInfo",
           CAP_PLUGIN_METHOD(get, CAPPluginReturnPromise);
)
