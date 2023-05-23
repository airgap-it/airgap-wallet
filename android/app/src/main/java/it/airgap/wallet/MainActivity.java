package it.airgap.wallet;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import it.airgap.wallet.plugin.appinfo.AppInfo;
import it.airgap.wallet.plugin.isolatedmodules.IsolatedModules;
import it.airgap.wallet.plugin.sapling.SaplingNative;
import it.airgap.wallet.plugin.zip.Zip;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(AppInfo.class);
    registerPlugin(SaplingNative.class);
    registerPlugin(Zip.class);
    registerPlugin(IsolatedModules.class);

    super.onCreate(savedInstanceState);
  }
}
