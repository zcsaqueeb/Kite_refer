import axios from "axios";
import chalk from "chalk";

const urlChecking = "https://raw.githubusercontent.com/Hunga9k50doker/APIs-checking/refs/heads/main/endpoints.json";

export const checkBaseUrl = async () => {
  console.log(chalk.blue("Checking api..."));

  const result = await getBaseApi(urlChecking);
  if (result.endpoint) {
    console.log(chalk.green("No change in api!"));
    return result;
  }
};

const getBaseApi = async (url) => {
  try {
    const response = await axios.get(url);
    const content = response.data;

    if (content?.kite) {
      return { endpoint: content.kite, message: content.copyright };
    } else {
      return {
        endpoint: null,
        message:
          "Nếu api thay đổi vui lòng liên hệ nhóm tele Airdrop Hunter Siêu Tốc (https://t.me/airdrophuntersieutoc) để biết thêm thông tin và cập nhật!| Have any issuess, please contact: https://t.me/airdrophuntersieutoc",
      };
    }
  } catch (e) {
    return {
      endpoint: null,
      message:
        "Nếu api thay đổi vui lòng liên hệ nhóm tele Airdrop Hunter Siêu Tốc (https://t.me/airdrophuntersieutoc) để biết thêm thông tin và cập nhật!| Have any issuess, please contact: https://t.me/airdrophuntersieutoc",
    };
  }
};
