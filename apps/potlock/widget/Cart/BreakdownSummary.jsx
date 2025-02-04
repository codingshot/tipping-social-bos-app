const { ownerId } = props;
const donationContractId = "donate.potlock.near";

const IPFS_BASE_URL = "https://nftstorage.link/ipfs/";
Big.PE = 100;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 20px;
  width: 380px;
  //   background: white;

  @media screen and (max-width: 768px) {
    width: 100%;
    margin-bottom: 50px;
  }
`;

const Title = styled.div`
  color: #2e2e2e;
  font-size: 24px;
  font-weight: 600;
  line-height: 32px;
  word-wrap: break-word;
`;

const CurrencyHeader = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-radius: 5px;
  background: #f0f0f0;
`;

const CurrencyHeaderText = styled.div`
  color: #7b7b7b;
  font-size: 12px;
  font-weight: 400;
  line-height: 14px;
  word-wrap: break-word;
`;

const BreakdownItemContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
`;

const BreakdownItemLeft = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  width: 50%;
  gap: 8px;
`;

const BreakdownItemRight = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
`;

const BreakdownItemText = styled.div`
  color: #2e2e2e;
  font-size: 14px;
  font-weight: 400;
  line-height: 16px;
  word-wrap: break-word;
`;

const CurrencyIcon = styled.img`
  width: 20px;
  height: 20px;
`;

const TotalContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-top: 1px #7b7b7b solid;
`;

const TotalText = styled.div`
  color: #2e2e2e;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  word-wrap: break-word;
`;

const ErrorText = styled.div`
  color: #dd3345;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  word-wrap: break-word;
  width: 100%;
  text-align: center;
`;

const MIN_REQUIRED_DONATION_AMOUNT_PER_PROJECT = 0.1;

const [amountsByFt, totalAmount, donationTooSmall] = useMemo(() => {
  const amountsByFt = {};
  let donationTooSmall = false;
  Object.entries(props.cart || {}).forEach(([projectId, { ft, amount }]) => {
    if (!amountsByFt[ft]) amountsByFt[ft] = 0;
    amountsByFt[ft] += parseFloat(amount || 0);
    if (amountsByFt[ft] < MIN_REQUIRED_DONATION_AMOUNT_PER_PROJECT) donationTooSmall = true;
  });
  const totalAmount = Object.values(amountsByFt).reduce((acc, amount) => acc + amount, 0);
  return [amountsByFt, totalAmount, donationTooSmall];
}, [props]);

const handleDonate = () => {
  // const transactions = [
  //     // set data on social.near
  //     {
  //       contractName: "social.near",
  //       methodName: "set",
  //       deposit: Big(JSON.stringify(socialArgs).length * 0.00003).mul(Big(10).pow(24)),
  //       args: socialArgs,
  //     },
  //   ];
  //   if (!props.edit) {
  //     transactions.push(
  //       // register project on potlock
  //       {
  //         contractName: registryId,
  //         methodName: "register",
  //         deposit: Big(0.05).mul(Big(10).pow(24)),
  //         args: potlockRegistryArgs,
  //       }
  //     );
  //     if (!existingHorizonProject) {
  //       transactions.push(
  //         // register on NEAR Horizon
  //         {
  //           contractName: horizonId,
  //           methodName: "add_project",
  //           args: horizonArgs,
  //         }
  //       );
  //     }
  //   }
  const transactions = [];

  Object.entries(props.cart).forEach(([projectId, { ft, amount, referrerId, note, potId }]) => {
    const amountFloat = 0;
    if (ft == "NEAR") {
      amountFloat = parseFloat(amount || 0);
    } else {
      amountFloat = parseFloat((amount / props.cart[props.projectId]?.price).toFixed(2) || 0);
    }
    const amountIndivisible = props.SUPPORTED_FTS[ft].toIndivisible(amountFloat);
    const donateContractArgs = {};
    const potContractArgs = {};
    if (potId) {
      potContractArgs.project_id = projectId;
      potContractArgs.referrer_id = referrerId;
    } else {
      donateContractArgs.recipient_id = projectId;
      donateContractArgs.referrer_id = referrerId;
      donateContractArgs.message = note;
    }
    transactions.push({
      contractName: potId ?? donationContractId,
      methodName: "donate",
      args: potId ? potContractArgs : donateContractArgs,
      deposit: amountIndivisible.toString(),
    });
  });

  const now = Date.now();
  Near.call(transactions);
  // NB: we won't get here if user used a web wallet, as it will redirect to the wallet
  // <-------- EXTENSION WALLET HANDLING -------->
  // poll for updates
  // TODO: update this to also poll Pot contract
  const pollIntervalMs = 1000;
  // const totalPollTimeMs = 60000; // consider adding in to make sure interval doesn't run indefinitely
  const pollId = setInterval(() => {
    Near.asyncView(donationContractId, "get_donations_for_donor", {
      donor_id: context.accountId,
      // TODO: implement pagination (should be OK without until there are 500+ donations from this user)
    }).then((donations) => {
      // for each project, there should be a matching donation that occurred since now()
      const foundDonations = [];
      // go through donations, add to foundDonations list
      for (const donation of donations) {
        const { recipient_id: projectId, donated_at_ms, total_amount } = donation;
        const matchingCartItem = props.cart[projectId];
        const ft_id = props.cart[projectId]?.ft == "NEAR" ? "NEAR" : "USD"; // TODO: remove hardcoding to support other FTs
        if (
          matchingCartItem &&
          donated_at_ms > now &&
          props.SUPPORTED_FTS[ft_id].toIndivisible(matchingCartItem.amount).toString() ==
            total_amount
        ) {
          foundDonations.push(donation);
        }
      }
      if (foundDonations.length === Object.keys(props.cart).length) {
        // all donations found
        // display success message & clear cart
        clearInterval(pollId);
        props.updateSuccessfulDonationRecipientId(foundDonations[0].recipient_id);
        props.setCheckoutSuccess(true);
        props.clearCart();
      }
    });
  }, pollIntervalMs);
};
console.log("props", props);
return (
  <Container>
    <Title>Breakdown summary</Title>
    <CurrencyHeader>
      <CurrencyHeaderText>Currency</CurrencyHeaderText>
      <CurrencyHeaderText>
        {props.cart[props.projectId]?.ft == "USD" ? "USD" : "NEAR"}
      </CurrencyHeaderText>
    </CurrencyHeader>
    {Object.entries(amountsByFt).map(([ft, amount]) => {
      const amountFloat = parseFloat(amount || 0);
      return (
        <BreakdownItemContainer>
          <BreakdownItemLeft>
            {props.cart[props.projectId]?.ft == "NEAR" ? (
              <CurrencyIcon src={props.SUPPORTED_FTS[ft].iconUrl} />
            ) : (
              "$"
            )}
            <BreakdownItemText>{amountFloat.toFixed(2)}</BreakdownItemText>
          </BreakdownItemLeft>
          <BreakdownItemRight>
            <BreakdownItemText>
              {props.cart[props.projectId]?.ft == "NEAR"
                ? `${amountFloat.toFixed(2)} N`
                : `${(amountFloat / props.cart[props.projectId]?.price).toFixed(2)} N`}
            </BreakdownItemText>
          </BreakdownItemRight>
        </BreakdownItemContainer>
      );
    })}
    <TotalContainer>
      <TotalText>Total</TotalText>
      <TotalText>
        {props.cart[props.projectId]?.ft == "NEAR"
          ? `${totalAmount.toFixed(2)} N`
          : `${(totalAmount / props.cart[props.projectId]?.price).toFixed(2)} N`}
      </TotalText>
    </TotalContainer>
    <Widget
      src={`${ownerId}/widget/Components.Button`}
      props={{
        type: "primary",
        // text: `Donate $${(totalAmount * props.nearToUsd || 0).toFixed(2)}`,
        text: `Donate ${
          props.cart[props.projectId]?.ft != "NEAR"
            ? `${(totalAmount / props.cart[props.projectId]?.price).toFixed(2)} N`
            : `${totalAmount.toFixed(2)} N`
        }`,
        disabled: !Object.keys(props.cart).length || donationTooSmall || !context.accountId,
        onClick: handleDonate,
        style: {
          width: "100%",
        },
      }}
    />
    {donationTooSmall && (
      <ErrorText>
        Minimum required donation per project is {MIN_REQUIRED_DONATION_AMOUNT_PER_PROJECT} N
      </ErrorText>
    )}
    {!context.accountId && <ErrorText>Please sign in to donate</ErrorText>}
  </Container>
);
