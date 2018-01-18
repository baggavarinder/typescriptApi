import * as mandrill from "mandrill-api";
const mandrill_client = new mandrill.Mandrill(process.env.MANDRILL_APIKEY);

export class MandrillModel {
  template_name: string;
  template_content: TemplateContent[];
  message: {
    html: string,
    text: string,
    subject: string,
    from_email: string,
    from_name: string,
    to: MailTo[]
  };
  async: boolean;
  ip_pool: string;
  send_at: Date;
}

export type MailTo = {
  email: string,
  name: string,
  type: "to"
};

export type TemplateContent = {
  name: string,
  // content: string,
  title: string
};

export class MandrillHelper {

  SendEmail = (options: MandrillModel, done: Function, error: Function) => {
    // console.log(process.env.MANDRILL_APIKEY);
    mandrill_client.messages.sendTemplate({ "template_name": options.template_name, "template_content": options.template_content, "message": options.message, "async": options.async, "ip_pool": options.ip_pool, "send_at": options.send_at },
      function(result: any) {
        // console.log(result);
        done(result);
      }, function(e: any) {
        // console.log(e);
        error(e);
      });
  };
}
