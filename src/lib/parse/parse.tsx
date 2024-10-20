import { https } from "follow-redirects";
import URI from "urijs";
import he from "he";


async function resolveShorURL(url: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    https
      .get(url, (response) => {
        resolve(response.responseUrl);
      })
      .on("error", (err) => {
        console.warn(`Error parsing url ${url}`);
        resolve(url);
      });
  });
}

export async function cleanTweetText(tweetFullText: string): Promise<string> {
  // let newText = tweetFullText;
  // const urls: string[] = [];
  // URI.withinString(tweetFullText, (url, start, end, source) => {
  //   urls.push(url);
  //   return url;
  // });

  // if (urls.length > 0) {
  //   const newUrls: string[] = [];
  //   for (let index = 0; index < urls.length; index++) {
  //     const newUrl = await resolveShorURL(urls[index]);
  //     newUrls.push(newUrl);
  //   }
  //
  //   if (newUrls.length > 0) {
  //     let j = 0;
  //     newText = URI.withinString(tweetFullText, (url, start, end, source) => {
  //       // I exclude links to photos, because they have already been inserted into the Bluesky post independently
  //       if (
  //         ([]).some((handle) =>
  //           newUrls[j].startsWith(`https://x.com/${handle}/`),
  //         ) &&
  //         newUrls[j].indexOf("/photo/") > 0
  //       ) {
  //         j++;
  //         return "";
  //       } else return newUrls[j++];
  //     });
  //   }
  // }
  //
  // newText = he.decode(newText);
  //
  // return newText;
}

