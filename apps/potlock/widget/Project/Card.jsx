const { ownerId } = props;
const donationContractId = "donate.potlock.near";

const Card = styled.a`
  display: flex;
  flex-direction: column;
  width: 100%;
  border-radius: 12px;
  background: white;
  box-shadow: 0px -2px 0px #dbdbdb inset;
  border: 1px solid #dbdbdb;
  &:hover {
    text-decoration: none;
    cursor: pointer;
  }
  margin-left: auto;
  margin-right: auto;
  height: 500px;
`;

const Info = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 145px;
  padding: 16px 24px;
  gap: 16px;
  flex: 1;

  @media screen and (max-width: 768px) {
    margin-top: 122px;
  }
`;

const Title = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #2e2e2e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
`;

const SubTitle = styled.div`
  font-size: 16px;
  font-weight: 400;
  color: #2e2e2e;
  word-wrap: break-word;
`;

const Tags = styled.div`
  display: flex;
  gap: 8px;
`;

const Tag = styled.span`
  box-shadow: 0px -0.699999988079071px 0px rgba(123, 123, 123, 0.36) inset;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid rgba(123, 123, 123, 0.36);
  color: #2e2e2e;
`;

const DonationsInfoContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  width: 100%;
  border-top: 1px #f0f0f0 solid;
`;

const DonationsInfoItem = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
`;

const projectId = props.project.id || props.projectId || context.accountId;
const projectProfile = Social.getr(`${projectId}/profile`);

if (!projectProfile) return "";

const MAX_DESCRIPTION_LENGTH = 80;

const { name, description, category } = projectProfile;
// const name = projectProfile?.name || "No name";
// const description = projectProfile?.description || "No description";
// const category = projectProfile?.category || "No category";

const tags = [category.text ?? props.CATEGORY_MAPPINGS[category] ?? ""];

const donationsForProject = Near.view(donationContractId, "get_donations_for_recipient", {
  recipient_id: projectId,
});

console.log(donationsForProject);

const [totalAmount, totalDonors] = useMemo(() => {
  if (!donationsForProject) return [null, null];
  const donors = [];
  let totalDonationAmount = new Big(0);
  for (const donation of donationsForProject) {
    if (!donors.includes(donation.donor_id)) {
      donors.push(donation.donor_id);
    }
    totalDonationAmount = totalDonationAmount.plus(new Big(donation.total_amount));
  }
  return [
    props.nearToUsd
      ? (props.nearToUsd * totalDonationAmount.div(1e24).toNumber()).toFixed(2)
      : totalDonationAmount.div(1e24).toNumber().toFixed(2),
    donors.length,
  ];
}, [donationsForProject]);

return (
  <Card href={`?tab=project&projectId=${projectId}`} key={projectId}>
    <Widget
      src={`${ownerId}/widget/Project.BannerHeader`}
      props={{
        ...props,
        projectId,
        profile,
        profileImageTranslateYPx: 145,
        profileImageTranslateYPxMobile: 122,
        containerStyle: {
          paddingLeft: "16px",
        },
        backgroundStyle: {
          objectFit: "cover",
          left: 0,
          top: 0,
          height: "168px",
          borderRadius: "6px 6px 0px 0px",
        },
        imageStyle: {
          width: "40px",
          height: "40px",
          position: "absolute",
          bottom: "-10px",
          left: "14px",
        },
      }}
    />
    <Info>
      <Title>{name}</Title>
      <SubTitle>
        {description.length > MAX_DESCRIPTION_LENGTH
          ? description.slice(0, MAX_DESCRIPTION_LENGTH) + "..."
          : description}
      </SubTitle>
      <Widget
        src={`${ownerId}/widget/Project.Tags`}
        props={{
          ...props,
          tags,
        }}
      />
    </Info>
    <DonationsInfoContainer>
      <DonationsInfoItem>
        <Title>{totalDonors || totalDonors === 0 ? totalDonors : "-"}</Title>
        <SubTitle>{totalDonors === 1 ? "Donor" : "Donors"}</SubTitle>
      </DonationsInfoItem>
      <DonationsInfoItem>
        <Title>{props.nearToUsd ? `$${totalAmount}` : `${totalAmount} N`}</Title>
        <SubTitle>Raised</SubTitle>
      </DonationsInfoItem>
    </DonationsInfoContainer>
    {props.allowDonate && (
      <Widget
        src={`${ownerId}/widget/Cart.AddToCart`}
        props={{
          ...props,
          projectId,
          style: {
            borderRadius: "0px 0px 6px 6px",
            boxShadow: "0px",
            border: "0px",
          },
          stopPropagation: true,
          showModal: false,
        }}
      />
    )}
  </Card>
);
