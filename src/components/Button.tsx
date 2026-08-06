import styled from "styled-components";
import configData from "../common/config.json";

export const Button = styled.button`
  background-color: #ffffff;
  box-shadow: 8px 8px 0px 0px hsl(9000 50% 20%);
  padding: 20px 20px 20px 20px;

  min-width: 120 px;
  width: fit-content;

  font-weight: bold;
  font-family: "Roboto Condensed", sans-serif;

  // Center content
  display: flex;
  align-items: center;
  justify-content: center;

  @media only screen and (max-width: ${configData.mobileThreshold}) {
    padding: 10px 10px 10px 10px;
    box-shadow: 5px 5px 0px 0px hsl(9000 50% 20%);
    font-size: 0.8rem;
  }
`;
