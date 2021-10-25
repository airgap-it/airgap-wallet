package it.airgap.wallet;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;

import java.util.ArrayList;

import it.airgap.wallet.plugin.AppInfo;
import it.airgap.wallet.plugin.SaplingNative;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    registerPlugin(AppInfo.class);
    registerPlugin(SaplingNative.class);
  }
}
