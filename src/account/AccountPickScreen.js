/* @flow strict-local */

import React, { useContext, useCallback } from 'react';
import { Alert } from 'react-native';

import * as api from '../api';
import { TranslationContext } from '../boot/TranslationProvider';
import type { RouteProp } from '../react-navigation';
import type { AppNavigationProp } from '../nav/AppNavigator';
import * as NavigationService from '../nav/NavigationService';
import type { Dispatch } from '../types';
import { connect } from '../react-redux';
import { getHasAuth, getAccountStatuses } from '../selectors';
import type { AccountStatus } from './accountsSelectors';
import { Centerer, ZulipButton, Logo, Screen, ViewPlaceholder } from '../common';
import AccountList from './AccountList';
import {
  navigateToRealmInputScreen,
  accountSwitch,
  removeAccount,
  navigateToAuth,
} from '../actions';
import type { ApiResponseServerSettings } from '../api/settings/getServerSettings';
import { showErrorAlert } from '../utils/info';

type Props = $ReadOnly<{|
  navigation: AppNavigationProp<'account-pick'>,
  route: RouteProp<'account-pick', void>,

  accounts: $ReadOnlyArray<AccountStatus>,
  dispatch: Dispatch,
  hasAuth: boolean,
|}>;

function AccountPickScreen(props: Props) {
  const { accounts, hasAuth, dispatch } = props;
  const _ = useContext(TranslationContext);

  const handleAccountSelect = useCallback(
    async (index: number) => {
      const { realm, isLoggedIn } = accounts[index];
      if (isLoggedIn) {
        setTimeout(() => {
          dispatch(accountSwitch(index));
        });
      } else {
        try {
          const serverSettings: ApiResponseServerSettings = await api.getServerSettings(realm);
          NavigationService.dispatch(navigateToAuth(serverSettings));
        } catch (e) {
          showErrorAlert(_('Failed to connect to server: {realm}', { realm: realm.toString() }));
        }
      }
    },
    [accounts, _, dispatch],
  );

  const handleAccountRemove = useCallback(
    (index: number) => {
      const { realm, email } = accounts[index];
      Alert.alert(
        _('Remove account?'),
        _('This will make the mobile app on this device forget {email} on {realmUrl}.', {
          realmUrl: realm.toString(),
          email,
        }),
        [
          { text: _('Cancel'), style: 'cancel' },
          {
            text: _('Remove account'),
            style: 'destructive',
            onPress: () => {
              dispatch(removeAccount(index));
            },
          },
        ],
        { cancelable: true },
      );
    },
    [accounts, _, dispatch],
  );

  return (
    <Screen
      title="Pick account"
      centerContent
      padding
      canGoBack={
        // We can get here three ways:
        //  * the "switch accounts" button
        //  * the "log out" button
        //  * as the initial screen, if we have a known account but no API key.
        //
        // The "log out" button is a bit exceptional because it's the user
        // taking a navigational action... but the screen they just left
        // required the login they've just discarded, so they can't go back.
        //
        // So, show a "navigate back" UI in the first case, but not the other two.
        hasAuth
      }
      shouldShowLoadingBanner={false}
    >
      <Centerer>
        {accounts.length === 0 && <Logo />}
        <AccountList
          accounts={accounts}
          onAccountSelect={handleAccountSelect}
          onAccountRemove={handleAccountRemove}
        />
        <ViewPlaceholder height={16} />
        <ZulipButton
          text="Add new account"
          onPress={() => {
            NavigationService.dispatch(navigateToRealmInputScreen());
          }}
        />
      </Centerer>
    </Screen>
  );
}

export default connect(state => ({
  accounts: getAccountStatuses(state),
  hasAuth: getHasAuth(state),
}))(AccountPickScreen);
