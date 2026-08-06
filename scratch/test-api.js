

async function test() {
  try {
    const res = await fetch('https://raghav-srivastava.vercel.app/api/portfolio');
    console.log('Status Code:', res.status);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
    const body = await res.text();
    console.log('Response Body:', body);
  } catch (err) {
    console.error('Error fetching API:', err);
  }
}

test();
