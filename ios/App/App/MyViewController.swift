//
//  MyViewController.swift
//  App
//
//  Created by Isacco on 16.07.2024.
//

import UIKit
import Capacitor

class MyViewController: CAPBridgeViewController {

    override func viewDidLoad() {
        super.viewDidLoad()

        // Do any additional setup after loading the view.
    }
    
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(AppInfo())
        bridge?.registerPluginInstance(Zip())
        bridge?.registerPluginInstance(IsolatedModules())
        bridge?.registerPluginInstance(SaplingNative())
    }
    
    /*
    // MARK: - Navigation

    // In a storyboard-based application, you will often want to do a little preparation before navigation
    override func prepare(for segue: UIStoryboardSegue, sender: Any?) {
        // Get the new view controller using segue.destination.
        // Pass the selected object to the new view controller.
    }
    */

}
