import ChapterSelector from "@/components/manga/chapters";
import HamburgerMenu from "@/components/manga/mobile/hamburgerMenu";
import TopSection from "@/components/manga/info/topSection";
import Footer from "@/components/shared/footer";
import Head from "next/head";
import { useEffect, useState } from "react";
import { setCookie } from "nookies";
import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/[...nextauth]";
import getAnifyInfo from "@/lib/anify/info";
import { NewNavbar } from "@/components/shared/NavBar";

export default function Manga({ info, userManga }) {
  const [domainUrl, setDomainUrl] = useState("");
  const [firstEp, setFirstEp] = useState();
  const chaptersData = info.chapters.data;

  useEffect(() => {
    setDomainUrl(window.location.origin);
  }, []);

  return (
    <>
      <Head>
        <title>
          {info
            ? `Manga - ${
                info.title.romaji || info.title.english || info.title.native
              }`
            : "Getting Info..."}
        </title>
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content={`Moopa - ${info.title.romaji || info.title.english}`}
        />
        <meta
          name="twitter:description"
          content={`${info.description?.slice(0, 180)}...`}
        />
        <meta
          name="twitter:image"
          content={`${domainUrl}/api/og?title=${
            info.title.romaji || info.title.english
          }&image=${info.bannerImage || info.coverImage}`}
        />
        <meta
          name="title"
          data-title-romaji={info?.title?.romaji}
          data-title-english={info?.title?.english}
          data-title-native={info?.title?.native}
        />
      </Head>
      <div className="min-h-screen w-screen flex flex-col items-center relative">
        <HamburgerMenu />
        <NewNavbar info={info} manga={true} />
        <div className="flex flex-col w-screen items-center gap-5 md:gap-10 py-10 pt-nav">
          <div className="flex-center w-full relative z-30">
            <TopSection info={info} firstEp={firstEp} setCookie={setCookie} />
            <>
              <div className="absolute hidden md:block z-20 bottom-0 h-1/2 w-full bg-secondary" />
              <div className="absolute hidden md:block z-20 top-0 h-1/2 w-full bg-transparent" />
            </>
          </div>
          <div className="w-[90%] xl:w-[70%] min-h-[35vh] z-40">
            {chaptersData.length > 0 ? (
              <ChapterSelector
                chaptersData={chaptersData}
                data={info}
                setFirstEp={setFirstEp}
                setCookie={setCookie}
                userManga={userManga}
              />
            ) : (
              <p>No Chapter Available :(</p>
            )}
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  const accessToken = session?.user?.token || null;

  const { id } = context.query;
  const key = process.env.API_KEY;
  const data = await getAnifyInfo(id, key);

  let userManga = null;

  if (session) {
    const response = await fetch("https://graphql.anilist.co/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: JSON.stringify({
        query: `
        query ($id: Int) {
              Media (id: $id) {
                mediaListEntry {
                  status
                  progress
                  progressVolumes
                  status
                }
                id
                idMal
                title {
                  romaji
                  english
                  native
                }
              }
            }
        `,
        variables: {
          id: parseInt(id),
        },
      }),
    });
    const data = await response.json();
    const user = data?.data?.Media?.mediaListEntry;
    if (user) {
      userManga = user;
    }
  }

  if (!data?.chapters) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      info: data,
      userManga,
    },
  };
}
